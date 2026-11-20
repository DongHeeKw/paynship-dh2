import { mergeConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import base from '../../../vitest.config';
import { mcdcPlugin } from './plugin.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export default mergeConfig(base,{
  plugins:[mcdcPlugin(root)],
  test:{setupFiles:[fileURLToPath(new URL('./setup.mjs',import.meta.url))],coverage:{enabled:false}},
});
