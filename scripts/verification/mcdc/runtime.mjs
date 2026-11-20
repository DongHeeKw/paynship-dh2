const key = Symbol.for('paynship.mcdc.test.collector');

// Test-only module. The collector stores booleans and test labels, never values,
// addresses, tokens, request bodies or any provider response.
export function installCollector(testName = () => '<module initialization>') {
  globalThis[key] = { records: new Map(), testName };
}
export function snapshot() { return [...(globalThis[key]?.records.values() ?? [])]; }
export function decide(id, count, evaluate) {
  const values = Array(count).fill(null);
  const condition = (index, value) => { values[index] = Boolean(value); return value; };
  // If a predicate throws, no completed decision exists; propagate unchanged.
  const value = evaluate(condition);
  const collector = globalThis[key];
  if (collector) {
    const result = Boolean(value);
    const signature = id + ':' + values.map(v => v === null ? '-' : v ? 'T' : 'F').join('') + ':' + result;
    const test = collector.testName() || '<module initialization>';
    const existing = collector.records.get(signature);
    if (existing) { if (!existing.tests.includes(test) && existing.tests.length < 8) existing.tests.push(test); }
    else collector.records.set(signature, { id, values, result, tests: [test] });
  }
  return value;
}
