/**
 * DEV — Provider 단독 호출 테스트.
 *  Shinhan → KEXIM chain 검증용.
 */
import 'dotenv/config';
import { tryProviders } from '../../lib/exchange-rate/providers/types';
import { shinhanProvider } from '../../lib/exchange-rate/providers/shinhan';
import { keximProvider } from '../../lib/exchange-rate/providers/kexim';
import { V21_CURRENCY_CODES } from '../../lib/exchange-rate/constants';

async function main() {
  console.log('Provider chain test: Shinhan → KEXIM');
  console.log('Presentment 8:', V21_CURRENCY_CODES.join(', '));
  const snap = await tryProviders([shinhanProvider, keximProvider], V21_CURRENCY_CODES);
  console.log('provider:', snap.provider);
  console.log('fetchedAt:', snap.fetchedAt.toISOString());
  console.log('KRW base rates (1 CCY = X KRW):', snap.rates);
}
main().catch(e => { console.error(e); process.exit(1); });
