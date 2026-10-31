import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectProductEvidence } from '../../lib/product-evidence/collect.mjs';
import { productUrl } from '../../lib/product-evidence/product-url.mjs';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(workspace, 'data/samples');
const urls = process.argv.slice(2);
if (!urls.length || urls.length > 10) throw new Error('Pass 1 to 10 HTTPS product URLs; requests run serially without retries.');
const validatedUrls = [...new Set(urls.map(url => productUrl(url).href))];
const products = [];
for (const url of validatedUrls) products.push(await collectProductEvidence(url));
await fs.mkdir(directory, { recursive: true });
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), operatorOnly: true, concurrency: 1, maxProducts: 10, retries: 0, products };
const output = path.join(directory, `product-evidence-${date}.json`);
await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, results: products.map(product => ({ url: product.sourceUrl, status: product.fetchStatus, observedFields: Object.keys(product.fields) })) }, null, 2));
