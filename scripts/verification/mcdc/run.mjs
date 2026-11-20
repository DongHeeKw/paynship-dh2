import { readFileSync,writeFileSync,readdirSync,mkdirSync,rmSync,statSync } from 'node:fs';
import { resolve,relative,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { roots,isSource,protectedFiles } from './config.mjs';
import { sourceDecisions } from './instrument.mjs';
import { decisionCoverage } from './analysis.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
process.chdir(root);
const args=process.argv.slice(2);
if(args.some(arg=>!['--report-only','--analyze-only'].includes(arg)))throw Error('Unknown MC/DC option');
const output=resolve(root,'coverage/mcdc');
const raw=resolve(output,'raw');
function sources(path) {
  if(statSync(path).isDirectory())return readdirSync(path).sort().filter(n=>!['node_modules','__tests__','.tools'].includes(n)).flatMap(n=>sources(resolve(path,n)));
  const name=relative(root,path).replaceAll('\\','/');
  return isSource(name)?[name]:[];
}
const files=roots.flatMap(p=>sources(resolve(root,p)));
const inventory=files.flatMap(path=>sourceDecisions(readFileSync(path,'utf8'),path));
for(const path of protectedFiles)if(!files.includes(path))throw Error('Missing protected source: '+path);
mkdirSync(output,{recursive:true});
let status=0;
if(!args.includes('--analyze-only')) {
  rmSync(raw,{recursive:true,force:true});mkdirSync(raw,{recursive:true});
  const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','scripts/verification/mcdc/vitest.config.mts'],{
    stdio:'inherit',env:{...process.env,PAYNSHIP_MCDC:'1'},cwd:root,
  });
  status=result.status??1;
  writeFileSync(resolve(output,'run.json'),JSON.stringify({status,finishedAt:new Date().toISOString()}));
}
const run=JSON.parse(readFileSync(resolve(output,'run.json'),'utf8'));
status ||= run.status;
const byID=new Map(inventory.map(d=>[d.id,[]]));
const rawFiles=readdirSync(raw).filter(f=>f.endsWith('.json'));
if(!rawFiles.length)throw Error('No test execution evidence');
for(const file of rawFiles)for(const row of JSON.parse(readFileSync(resolve(raw,file),'utf8'))) {
  if(!byID.has(row.id))throw Error('Stale or unknown source evidence: '+row.id);
  if(!Array.isArray(row.tests)||!row.tests.length||row.tests.some(t=>typeof t!=='string'))throw Error('Missing witness test identity');
  byID.get(row.id).push(row);
}
const decisions=inventory.map(d=>({...d,...decisionCoverage(d,byID.get(d.id))}));
function summary(list) {
  return {decisions:list.length,conditions:list.reduce((n,d)=>n+d.total,0),covered:list.reduce((n,d)=>n+d.covered,0),
    unsupported:list.filter(d=>!d.supported).length,unexecuted:list.filter(d=>!d.observations).length,
    incomplete:list.filter(d=>!d.supported||d.covered<d.total||!d.observations).length};
}
const core=decisions.filter(d=>protectedFiles.includes(d.path));
const report={schema:1,metric:'short-circuit masking MC/DC',generatedAt:new Date().toISOString(),testRun:run,
  sourceFiles:files.length,scope:roots,protectedFiles,all:summary(decisions),protected:summary(core),
  files:files.map(path=>({path,...summary(decisions.filter(d=>d.path===path))})),decisions};
writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rate=s=>s.conditions?`${s.covered}/${s.conditions} (${(100*s.covered/s.conditions).toFixed(2)}%)`:'no conditions';
const vector=row=>row.values.map(v=>v===null?'—':v?'T':'F').join(' ')+' → '+(row.result?'T':'F');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PayNShip MC/DC evidence</title><style>body{font:16px system-ui;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#18283b}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:.5rem;text-align:left}pre,code{white-space:pre-wrap;overflow-wrap:anywhere}details{margin:1rem 0;padding:.5rem;border:1px solid #cbd5e1}.missing{color:#a22}.covered{color:#075}small{color:#456}</style><h1>PayNShip MC/DC evidence</h1><p>Short-circuit masking MC/DC; measured from actual test executions. — means not evaluated. This is not unique-cause MC/DC or certified tool evidence.</p><p>Protected core: <b>${rate(report.protected)}</b>. Repository inventory: <b>${rate(report.all)}</b>. ${report.all.unsupported} unsupported and ${report.all.unexecuted} unexecuted decisions remain in the inventory. Test exit status: ${status}.</p><p>Inventory covers Boolean control tests, logical predicates, comparisons and negations in ${escape(roots.join(', '))}. Switch dispatch, optional chaining and nullish data selection are not Boolean condition decisions in this metric. No full application coverage claim is made.</p><p>Run: ${escape(run.finishedAt)}. Source hashes and witnesses: <a href="report.json">JSON evidence</a>.</p><table><tr><th>Source</th><th>Conditions covered</th><th>Unexecuted / unsupported decisions</th></tr>${report.files.filter(f=>f.decisions).map(f=>`<tr><td>${escape(f.path)}${protectedFiles.includes(f.path)?' [protected]':''}</td><td>${rate(f)}</td><td>${f.unexecuted} / ${f.unsupported}</td></tr>`).join('')}</table><h2>Decision witnesses and gaps</h2>${decisions.map(d=>`<details><summary class="${d.covered===d.total&&d.observations?'covered':'missing'}">${escape(d.path)}:${d.line}:${d.column} — ${d.covered}/${d.total}${d.supported?'':' UNSUPPORTED'}</summary><pre>${escape(d.expression)}</pre><small>SHA-256: ${d.sourceHash}</small>${d.reason?`<p>${escape(d.reason)}</p>`:''}<ol>${d.conditions.map((c,i)=>{const w=d.witnesses[i];return `<li><code>${escape(c.text)}</code>${w?`<p><code>${vector(w.a)}</code><br>${escape(w.a.tests.join('; '))}</p><p><code>${vector(w.b)}</code><br>${escape(w.b.tests.join('; '))}</p>`:'<p class="missing">No independent witness pair.</p>'}</li>`}).join('')}</ol></details>`).join('')}</html>`;
writeFileSync(resolve(output,'index.html'),html);
console.log(`MC/DC protected core: ${rate(report.protected)}; ${report.protected.incomplete} incomplete decisions.`);
console.log(`MC/DC repository inventory: ${rate(report.all)}; ${report.all.unsupported} unsupported, ${report.all.unexecuted} unexecuted decisions.`);
console.log('Evidence: coverage/mcdc/index.html and coverage/mcdc/report.json');
if(status)process.exit(status);
if(!args.includes('--report-only')&&report.protected.incomplete)process.exit(1);
