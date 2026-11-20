import { afterAll, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { installCollector, snapshot } from './runtime.mjs';
const root=process.cwd();
const output=resolve(root,'coverage/mcdc/raw');
if(process.env.PAYNSHIP_MCDC!=='1')throw Error('MC/DC setup must run through the isolated verification command');
installCollector(()=> {
  const state=expect.getState();
  return relative(root,state.testPath??'unknown')+' :: '+(state.currentTestName??'<module initialization>');
});
afterAll(()=>writeFileSync(resolve(output,randomUUID()+'.json'),JSON.stringify(snapshot())));
