export interface PostalInputPolicy { required: boolean; pattern?: string; hint: string; sourceUrl?: string; }

const POSTAL_POLICIES: Record<string, PostalInputPolicy> = {
  HK: { required: false, hint: 'Hong Kong does not use postcodes. Leave this blank rather than inventing a code.', sourceUrl: 'https://www.upu.int/UPU/media/upu/publications/manualAddressingAddressingAndPostcodeManualEn.pdf' },
  JP: { required: true, pattern: '[0-9]{3}-?[0-9]{4}', hint: '7 digits, for example 100-0001. We check the format, not whether the address exists.', sourceUrl: 'https://www.post.japanpost.jp/service/search/zipcode/zipmanual/p04.html' },
  SG: { required: true, pattern: '[0-9]{6}', hint: '6 digits, for example 048581. Address delivery still needs review.', sourceUrl: 'https://www.singpost.com/dam/files/documents/2026-03/RAO_Template_(Effective_1_June_2012).pdf' },
  US: { required: true, pattern: '[0-9]{5}(-[0-9]{4})?', hint: '5-digit ZIP or ZIP+4, for example 10001 or 10001-1234.', sourceUrl: 'https://pe.usps.com/text/DMM300/207.htm' },
  TW: { required: true, pattern: '[0-9]{3}(-?[0-9]{2,3})?', hint: 'Use the current 6-digit code when available. 3- or legacy 5-digit entries are accepted for carrier review.', sourceUrl: 'https://www.post.gov.tw/post/internet/Postal/index.jsp?ID=208' },
};

export function getPostalInputPolicy(country: string): PostalInputPolicy {
  return POSTAL_POLICIES[country] || { required: false, hint: 'Enter a postal code if your address uses one. The carrier will review this destination’s address requirements.' };
}
export function postalCodeFormatValid(country: string, value: string): boolean {
  const policy = getPostalInputPolicy(country);
  if (!value) return !policy.required;
  return !policy.pattern || new RegExp(`^(?:${policy.pattern})$`).test(value);
}
export function normalizePostalCode(country: string, value: string): string {
  if (country === 'JP' && /^\d{7}$/.test(value)) return `${value.slice(0, 3)}-${value.slice(3)}`;
  if (country === 'TW' && /^\d{3}-\d{2,3}$/.test(value)) return value.replace('-', '');
  return value;
}
