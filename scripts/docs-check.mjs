import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
let paths;
try {
  const base = process.env.DOCS_CHECK_BASE_REF || 'HEAD';
  paths = new Set([
    ...git(['diff', '--name-only', base]).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ].filter(path => path && !/^(node_modules\/|\.next\/|\.browser-data\/)/.test(path)));
} catch {
  console.error('[docs-check] Git context unavailable. Check repository access and DOCS_CHECK_BASE_REF.');
  process.exit(1);
}
const rules = [
  ['Product and schema', /^(app\/|lib\/purchases\/|prisma\/)/, ['documents/PRODUCT_SPECIFICATION.md', 'documents/Features/STATUS.md']],
  ['Authentication and local preview', /^(app\/(login|auth|dev\/preview)\/|lib\/(auth|supabase|dev-preview)\/|components\/site\/SignInForm\.tsx|contexts\/AuthContext\.tsx)/, ['documents/Features/Auth/Spec.md', 'documents/Reference/SECURITY.md']],
  ['Requests and payments', /^(app\/api\/(purchases|admin\/purchases|admin\/support|webhooks)\/|lib\/purchases\/)/, ['documents/Features/Order-Checkout/Spec.md', 'documents/Features/STATUS.md']],
  ['Product evidence', /^lib\/purchases\/(product-url|categories|countries|review-schema|quote)\.ts$/, ['documents/Features/Product-Data-Pipeline/Spec.md']],
  ['Public product preparation', /^(lib\/purchases\/(intake-draft|product-preview)\.ts|components\/purchases\/(ProductPreview|ProductRequestFields|PurchaseForm|UrlIntake)\.tsx|app\/purchase\/page\.tsx)/, ['documents/Features/Product-Data-Pipeline/Spec.md', 'documents/PRODUCT_SPECIFICATION.md']],
  ['Evidence samples', /^(lib\/product-evidence\/|scripts\/product-samples\/|data\/samples\/)/, ['documents/Features/Product-Data-Pipeline/Spec.md']],
  ['Country and recipient policy', /^(lib\/customs\/|lib\/purchases\/(schemas|profile|recipient-review)\.ts|components\/purchases\/(DeliveryForm|DeliveryAddressFields|RecipientCustomsFields|CustomsVerificationNotice|delivery-form-data)\.)/, ['documents/Reference/COUNTRY_CUSTOMS.md']],
  ['Security', /^(middleware\.ts|app\/dev\/preview\/|lib\/(security|auth|supabase|dev-preview)\/|lib\/purchases\/(auth|pii|api|quota|transaction|read)\.ts|prisma\/sql\/)/, ['documents/Reference/SECURITY.md', 'documents/Features/STATUS.md']],
  ['Deployment', /^(package\.json|\.env\.example|scripts\/|deploy\/|\.github\/workflows\/|prisma\/sql\/|next\.config\.|vercel\.json)/, ['documents/Reference/Deployment/DEPLOYMENT.md', 'documents/Reference/Deployment/LINUX_RELEASE.md', 'documents/Features/STATUS.md']],
  ['Documentation policy', /^(AGENTS\.md|CLAUDE\.md|documents\/_meta\/)/, ['documents/_meta/DOC_GOVERNANCE.md', 'documents/_meta/REGISTRY.yaml', 'documents/_meta/AGENT_CONTEXT_PLAYBOOK.md']],
];
let failed = false;
for (const [name, code, docs] of rules) {
  if (![...paths].some(path => code.test(path))) continue;
  if (!docs.some(path => paths.has(path) && existsSync(path))) {
    console.error('[docs-check] Update ' + docs.join(' or ') + ' for ' + name);
    failed = true;
  }
}
for (const path of ['README.md', 'AGENTS.md', 'documents/PRODUCT_SPECIFICATION.md', 'documents/Features/STATUS.md', 'documents/Features/Auth/Spec.md', 'documents/Features/Product-Data-Pipeline/Spec.md', 'documents/Features/Order-Checkout/Spec.md', 'documents/Reference/COUNTRY_CUSTOMS.md', 'documents/Reference/SECURITY.md', 'documents/Reference/OPERATIONS.md', 'documents/Reference/TAX_AND_CUSTOMS.md', 'documents/Reference/Deployment/DEPLOYMENT.md', 'documents/Reference/Deployment/LINUX_RELEASE.md', 'documents/_meta/REGISTRY.yaml']) {
  if (!existsSync(path)) { console.error('[docs-check] Missing current source: ' + path); failed = true; }
}
if (failed) process.exit(1);
console.log('[docs-check] Current documentation synchronization rules passed.');
