import { productUrl } from './network-policy.mjs';
import { fetchPublicPage } from './http.mjs';
import { robotsPermits } from './robots.mjs';
import { extractEvidence, REQUIRED_EVIDENCE_FIELDS } from './extract.mjs';

export async function collectProductEvidence(input) {
  const source = productUrl(input);
  const retrievedAt = new Date().toISOString();
  const base = { sourceUrl: source.href, retrievedAt, fields: {}, missingFields: REQUIRED_EVIDENCE_FIELDS, customsStatus: 'review_required' };
  try {
    const robotsUrl = new URL('/robots.txt', source.origin);
    const robots = await fetchPublicPage(robotsUrl);
    base.robotsStatus = robots.status;
    if (robots.status !== 404 && (robots.status !== 200 || !robotsPermits(robots.body, source.pathname + source.search))) {
      return { ...base, fetchStatus: 'robots_blocked', robotsStatus: robots.status };
    }
    let finalUrl = source;
    let response = await fetchPublicPage(finalUrl);
    base.httpStatus = response.status;
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const redirect = productUrl(new URL(response.location ?? '', finalUrl).href);
      if (redirect.hostname !== source.hostname || !robotsPermits(robots.body, redirect.pathname + redirect.search)) {
        throw new Error('redirect_not_allowed');
      }
      finalUrl = redirect;
      response = await fetchPublicPage(finalUrl);
      base.httpStatus = response.status;
    }
    if (response.status !== 200) return { ...base, finalUrl: finalUrl.href, fetchStatus: 'http_blocked', httpStatus: response.status };
    if (!response.contentType.includes('text/html')) throw new Error('unsupported_content_type');
    return { ...extractEvidence(response.body, source.href, retrievedAt, response.sha256), finalUrl: finalUrl.href, httpStatus: 200,
      fetchStatus: 'fetched', responseBytes: response.bytes, robotsStatus: robots.status };
  } catch (error) {
    const known = ['unsafe_dns_address', 'response_too_large', 'request_timeout', 'redirect_not_allowed',
      'unreadable_robots_policy', 'robots_line_limit_exceeded', 'robots_rule_limit_exceeded', 'oversized_robots_rule',
      'unsupported_product_url', 'unsupported_content_type', 'response_size_or_encoding_not_supported'];
    return { ...base, fetchStatus: 'fetch_failed', failure: known.includes(error.message) ? error.message : 'network_or_policy_failure' };
  }
}
