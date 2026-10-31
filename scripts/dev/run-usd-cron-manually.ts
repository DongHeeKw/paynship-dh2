/**
 * DEV — cron 엔드포인트 로직을 직접 실행 (HTTP 경유 없이)
 * Provider chain (Shinhan → KEXIM) 호출 후 듀얼 저장.
 */
import 'dotenv/config';
import { refreshUsdRates } from '../../lib/exchange-rate/service';

async function main() {
  const result = await refreshUsdRates();
  console.log(`✓ saved ${result.saved} rows (provider=${result.provider})`);
  console.log(`  fetchedAt: ${result.fetchedAt.toISOString()}`);
  console.log(`  KRW pair sample:`);
  console.log(`    USD=${result.snapshot.rates.USD}, JPY=${result.snapshot.rates.JPY}, EUR=${result.snapshot.rates.EUR}`);
}
main().catch(e => { console.error(e); process.exit(1); });
