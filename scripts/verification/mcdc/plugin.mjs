import { relative, resolve } from 'node:path';
import { instrumentSource } from './instrument.mjs';
import { isSource } from './config.mjs';
export function mcdcPlugin(root) {
  return {name:'paynship-test-only-mcdc',enforce:'pre',transform(code,id) {
    const path=relative(root,id.split('?')[0]).replaceAll('\\','/');
    if(!isSource(path))return null;
    return {code:instrumentSource(code,path,resolve(root,'scripts/verification/mcdc/runtime.mjs')).code,map:null};
  }};
}
