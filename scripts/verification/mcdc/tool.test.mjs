import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentSource, sourceDecisions } from './instrument.mjs';
import { independence, decisionCoverage } from './analysis.mjs';
import { installCollector, snapshot } from './runtime.mjs';

const expression = { op: 'and', left: { condition: 0 }, right: { op: 'or', left: { condition: 1 }, right: { condition: 2 } } };
test('witness pairs require an evaluated target flip and a decision flip', () => {
  assert.equal(independence(expression, 0, { values:[false,null,null], result:false }, { values:[true,true,null], result:true }), true);
  assert.equal(independence(expression, 0, { values:[true,false,true], result:true }, { values:[true,true,null], result:true }), false);
  assert.equal(independence(expression, 1, { values:[true,false,false], result:false }, { values:[true,true,null], result:true }), true);
  assert.equal(independence(expression, 1, { values:[false,null,null], result:false }, { values:[true,true,null], result:true }), false);
});
test('different evaluated non-target conditions cannot manufacture independence', () => {
  assert.equal(independence(expression, 1, { values:[true,false,false], result:false }, { values:[true,true,true], result:true }), false);
});
test('empty, malformed and impossible traces never receive credit', () => {
  assert.equal(decisionCoverage({ tree:expression, conditions:[1,2,3] }, []).covered, 0);
  assert.throws(()=>decisionCoverage({ tree:expression, conditions:[1,2,3] }, [{ values:[true], result:true }]), /trace/i);
  assert.throws(()=>decisionCoverage({ tree:expression, conditions:[1,2,3] }, [{ values:[false,true,true], result:true }]), /trace/i);
});
test('a complete Boolean truth table provides an actual witness for every condition', () => {
  const rows=[];
  for(const a of [false,true]) for(const b of [false,true]) for(const c of [false,true]) rows.push({values:[a,a?b:null,a&&!b?c:null],result:a&&(b||c),tests:['actual test']});
  const report=decisionCoverage({tree:expression,conditions:[1,2,3]},rows);
  assert.equal(report.covered,3);
  assert.equal(report.witnesses.length,3);
});
test('source inventory retains unloaded decisions and explicitly flags suspension', () => {
  const source='export async function gate(a,b) { if (a && await b()) return 1; return 0; }';
  const entries=sourceDecisions(source,'lib/example.ts');
  assert.equal(entries.length,1);
  assert.equal(entries[0].supported,false);
  assert.match(entries[0].reason,/await|suspension/i);
  assert.equal(sourceDecisions(source+'\n','lib/example.ts')[0].id===entries[0].id,false);
});
test('instrumentation preserves short circuit, original values, side effects and nested decisions', async () => {
  installCollector(()=> 'semantics witness');
  const source=`export function check(a, object) { if (a && object.value) return 'accepted'; return 'blocked'; }
  export function nested(a,b,c) { return a && (b ? c : false); }
  export function negate(a,b) { return !(a && b); }`;
  const compiled=instrumentSource(source,'lib/example.ts',new URL('./runtime.mjs',import.meta.url).href);
  assert.ok(compiled.code.includes('__pnMcdc'));
  const module=await import('data:text/javascript,'+encodeURIComponent(compiled.code));
  let reads=0;const object={get value(){reads++;return 'original value';}};
  assert.equal(module.check(false,object),'blocked'); assert.equal(reads,0);
  assert.equal(module.check(true,object),'accepted'); assert.equal(reads,1);
  assert.equal(module.nested(true,true,'original value'),'original value');
  assert.equal(module.nested(false,true,'original value'),false);
  assert.equal(module.negate(true,false),true);
  const rows=snapshot();assert.ok(rows.length>=3);
  assert.ok(rows.some(row=>row.values.includes(null)));
  assert.ok(rows.every(row=>row.tests.includes('semantics witness')));
});
test('throwing predicates are not credited as completed decisions or re-evaluated', async () => {
  installCollector(()=> 'throw witness');
  const code=instrumentSource('export function check(a,b) { if(a && b()) return 1; return 0; }','lib/throw.ts',new URL('./runtime.mjs',import.meta.url).href).code;
  const module=await import('data:text/javascript,'+encodeURIComponent(code));
  let calls=0;assert.throws(()=>module.check(true,()=>{calls++;throw Error('fixture');}),/fixture/);
  assert.equal(calls,1);assert.equal(snapshot().length,0);
  assert.equal(module.check(false,()=>true),0);assert.equal(snapshot().length,1);
});
