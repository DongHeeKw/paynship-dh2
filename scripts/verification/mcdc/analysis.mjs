function evaluate(tree, values, visited = []) {
  if ('constant' in tree) return tree.constant;
  if ('condition' in tree) { visited.push(tree.condition); return values[tree.condition]; }
  if (tree.op === 'not') return !evaluate(tree.child, values, visited);
  if (tree.op === 'and') return evaluate(tree.left, values, visited) && evaluate(tree.right, values, visited);
  if (tree.op === 'or') return evaluate(tree.left, values, visited) || evaluate(tree.right, values, visited);
  throw Error('Unsupported Boolean tree');
}
function validTrace(tree, count, row) {
  if (!Array.isArray(row.values) || row.values.length !== count || typeof row.result !== 'boolean' || row.values.some(v=>v!==null&&typeof v!=='boolean')) return false;
  const visited=[]; const result=evaluate(tree,row.values.map(v=>v??false),visited);
  return result===row.result && row.values.every((v,i)=>visited.includes(i)?v!==null:v===null);
}
/** Short-circuit masking: evaluated non-target values stay fixed. A skipped
 * operand is a don't-care, never an invented observation. Check a common
 * completion against the Boolean tree as well as the two actual traces. */
export function independence(tree, target, a, b) {
  if(a.result===b.result || a.values[target]===null || b.values[target]===null || a.values[target]===b.values[target]) return false;
  const shared=[];
  for(let i=0;i<a.values.length;i++) {
    if(i!==target && a.values[i]!==null && b.values[i]!==null && a.values[i]!==b.values[i]) return false;
    shared.push(a.values[i] ?? b.values[i] ?? false);
  }
  shared[target]=a.values[target];if(evaluate(tree,shared)!==a.result) return false;
  shared[target]=b.values[target];return evaluate(tree,shared)===b.result;
}
export function decisionCoverage(decision, input) {
  const rows=[];const signatures=new Set();
  for(const row of input) {
    if(!validTrace(decision.tree,decision.conditions.length,row)) throw Error('Invalid MC/DC trace for '+(decision.id??'decision'));
    const signature=JSON.stringify([row.values,row.result]);
    if(!signatures.has(signature)) {rows.push(row);signatures.add(signature);}
  }
  const witnesses=decision.conditions.map((_,target)=>{
    for(let i=0;i<rows.length;i++) for(let j=i+1;j<rows.length;j++) if(independence(decision.tree,target,rows[i],rows[j])) return {condition:target,a:rows[i],b:rows[j]};
    return null;
  });
  return {covered:witnesses.filter(Boolean).length,total:decision.conditions.length,witnesses,observations:rows.length,
    outcomes:[...new Set(rows.map(row=>row.result))]};
}
