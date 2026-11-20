import ts from 'typescript';
import { createHash } from 'node:crypto';

function unwrap(node) {
  while(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node)) node=node.expression;
  return node;
}
const comparison=node=>ts.isBinaryExpression(node)&&[ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.LessThanToken,ts.SyntaxKind.LessThanEqualsToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.GreaterThanEqualsToken,ts.SyntaxKind.InstanceOfKeyword,ts.SyntaxKind.InKeyword].includes(node.operatorToken.kind);
const logical=node=>ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind);
function hasSuspension(node) {
  let found=false;
  function walk(n) {if(ts.isFunctionLike(n)&&n!==node)return;if(ts.isAwaitExpression(n)||ts.isYieldExpression(n))found=true;ts.forEachChild(n,walk);}
  walk(node);return found;
}
function parse(code,path) {
  const file=ts.createSourceFile(path,code,ts.ScriptTarget.Latest,true,path.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  if(file.parseDiagnostics.length)throw Error('Cannot inventory '+path+': '+file.parseDiagnostics[0].messageText);
  const hash=createHash('sha256').update(code).digest('hex');
  const candidates=new Map();const coveredNodes=new Set();
  function add(node,kind) {if(node&&!candidates.has(node))candidates.set(node,kind);}
  function controls(node) {
    if(ts.isIfStatement(node)||ts.isWhileStatement(node)||ts.isDoStatement(node))add(node.expression,'control');
    if(ts.isForStatement(node))add(node.condition,'loop');
    if(ts.isConditionalExpression(node))add(node.condition,'ternary');
    ts.forEachChild(node,controls);
  }
  controls(file);
  function mark(node) {
    coveredNodes.add(node);const unwrapped=unwrap(node);coveredNodes.add(unwrapped);
    if(logical(unwrapped)){mark(unwrapped.left);mark(unwrapped.right);}
    else if(ts.isPrefixUnaryExpression(unwrapped)&&unwrapped.operator===ts.SyntaxKind.ExclamationToken)mark(unwrapped.operand);
  }
  for(const node of candidates.keys())mark(node);
  function predicates(node) {
    if(logical(node)&&!coveredNodes.has(node)) {
      // Literal fallback values (e.g. env || 'USD') select data, not a Boolean
      // result. Control-flow tests using them are still inventoried above.
      const right=unwrap(node.right);
      if(!ts.isStringLiteral(right)&&!ts.isNumericLiteral(right)&&right.kind!==ts.SyntaxKind.NullKeyword) {add(node,'logical');mark(node);}
    }
    if(!coveredNodes.has(node)&&(comparison(node)||(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken))) {
      add(node,'predicate');mark(node);
    }
    ts.forEachChild(node,predicates);
  }
  predicates(file);
  const decisions=[];const byNode=new Map();
  for(const [node,kind] of candidates) {
    const leaves=[];
    function tree(n) {
      const e=unwrap(n);
      if(logical(e))return {op:e.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken?'and':'or',left:tree(e.left),right:tree(e.right)};
      if(ts.isPrefixUnaryExpression(e)&&e.operator===ts.SyntaxKind.ExclamationToken&&logical(unwrap(e.operand)))return {op:'not',child:tree(e.operand)};
      if(e.kind===ts.SyntaxKind.TrueKeyword||e.kind===ts.SyntaxKind.FalseKeyword)return {constant:e.kind===ts.SyntaxKind.TrueKeyword};
      const index=leaves.length;leaves.push(n);return {condition:index};
    }
    const structure=tree(node);const start=node.getStart(file);const location=file.getLineAndCharacterOfPosition(start);
    const suspension=hasSuspension(node);
    const reason=suspension?'await/yield suspension requires separate instrumentation':leaves.length>24?'more than 24 conditions':null;
    const entry={id:path+':'+(location.line+1)+':'+(location.character+1)+':'+hash.slice(0,12),path,sourceHash:hash,line:location.line+1,column:location.character+1,
      kind,expression:node.getText(file),tree:structure,conditions:leaves.map(leaf=>({text:leaf.getText(file),line:file.getLineAndCharacterOfPosition(leaf.getStart(file)).line+1})),supported:!reason,reason};
    decisions.push(entry);byNode.set(node,{entry,leaves});
  }
  return {file,decisions,byNode,hash};
}
export function sourceDecisions(code,path) {return parse(code,path).decisions;}
export function instrumentSource(code,path,runtimeSpecifier) {
  const {file,decisions,byNode,hash}=parse(code,path);
  if(!decisions.some(d=>d.supported))return {code,decisions};
  const functionName='__pnMcdc_'+hash.slice(0,10);
  if(code.includes(functionName))throw Error('MC/DC instrumentation identifier collision');
  const f=ts.factory;
  const transformed=ts.transform(file,[context=>root=>{
    function visit(node) {
      const selected=byNode.get(node);
      if(!selected||!selected.entry.supported)return ts.visitEachChild(node,visit,context);
      const conditionName=functionName+'_condition';
      const leafIndices=new Map(selected.leaves.map((leaf,i)=>[leaf,i]));
      function modify(n) {
        if(leafIndices.has(n))return f.createCallExpression(f.createIdentifier(conditionName),undefined,[f.createNumericLiteral(leafIndices.get(n)),ts.visitEachChild(n,visit,context)]);
        return ts.visitEachChild(n,modify,context);
      }
      return f.createCallExpression(f.createIdentifier(functionName),undefined,[f.createStringLiteral(selected.entry.id),f.createNumericLiteral(selected.leaves.length),
        f.createArrowFunction(undefined,undefined,[f.createParameterDeclaration(undefined,undefined,conditionName)],undefined,f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),modify(node))]);
    }
    const changed=ts.visitNode(root,visit);
    const imported=f.createImportDeclaration(undefined,f.createImportClause(false,undefined,f.createNamedImports([f.createImportSpecifier(false,f.createIdentifier('decide'),f.createIdentifier(functionName))])),f.createStringLiteral(runtimeSpecifier));
    const statements=[...changed.statements];
    let prologue=0;
    while(prologue<statements.length&&ts.isExpressionStatement(statements[prologue])&&ts.isStringLiteral(statements[prologue].expression))prologue++;
    statements.splice(prologue,0,imported);
    return f.updateSourceFile(changed,statements);
  }]);
  try{return {code:ts.createPrinter({newLine:ts.NewLineKind.LineFeed}).printFile(transformed.transformed[0]),decisions};}
  finally{transformed.dispose();}
}
