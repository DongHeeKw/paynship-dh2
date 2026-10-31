/** Match robots wildcards deterministically without executing a remote regular expression. */
function pathMatches(pattern, path) {
  const anchoredEnd = pattern.endsWith('$');
  const segments = (anchoredEnd ? pattern.slice(0, -1) : pattern).split('*');
  if (!path.startsWith(segments[0])) return false;
  let offset = segments[0].length;
  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index];
    if (anchoredEnd && index === segments.length - 1) return path.endsWith(segment) && path.length - segment.length >= offset;
    const found = path.indexOf(segment, offset);
    if (found < 0) return false;
    offset = found + segment.length;
  }
  return !anchoredEnd || offset === path.length;
}

export function robotsPermits(text, targetPath, agent = 'PayNShipEvidence') {
  if (text.length > 512 * 1024 || /<html/i.test(text)) throw new Error('unreadable_robots_policy');
  const lines = text.split(/\r?\n/);
  if (lines.length > 5000) throw new Error('robots_line_limit_exceeded');
  const groups = [];
  let group = { agents: [], rules: [] };
  let ruleCount = 0;
  for (const line of lines) {
    const match = line.replace(/#.*/, '').trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const [, name, value] = match;
    if (name.toLowerCase() === 'user-agent') {
      if (group.rules.length) { groups.push(group); group = { agents: [], rules: [] }; }
      group.agents.push(value.toLowerCase());
    } else if (['allow', 'disallow'].includes(name.toLowerCase()) && value) {
      if (++ruleCount > 300) throw new Error('robots_rule_limit_exceeded');
      if (value.length > 2048) throw new Error('oversized_robots_rule');
      group.rules.push({ pattern: value, allow: name.toLowerCase() === 'allow' });
    }
  }
  groups.push(group);
  const specific = groups.filter(candidate => candidate.agents.some(value => value !== '*' && agent.toLowerCase().includes(value)));
  const selected = specific.length ? specific : groups.filter(candidate => candidate.agents.includes('*'));
  const matches = selected.flatMap(candidate => candidate.rules).filter(rule => pathMatches(rule.pattern, targetPath));
  matches.sort((a, b) => b.pattern.replaceAll('*', '').length - a.pattern.replaceAll('*', '').length || Number(b.allow) - Number(a.allow));
  return matches[0]?.allow ?? true;
}
