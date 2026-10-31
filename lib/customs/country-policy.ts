import { CUSTOMS_SOURCES as sources, POLICY_REVISION, POLICY_REVIEW_DUE_AT } from './sources';
import type { CountryCustomsPolicy } from './types';

const countryPolicies: Record<string, Omit<CountryCustomsPolicy, 'country' | 'revision' | 'reviewDueAt'>> = {
  TW: {
    id: 'TW_EXPRESS_AUTHORIZATION',
    requirement: 'EXTERNAL_AUTHORIZATION',
    customerHint: 'For Taiwan express imports, the recipient normally completes real-name registration and approves shipment details in EZ WAY. Use the recipient name and phone registered there. If you need a broker route, select it below. Do not send us a Taiwan ID number or EZ WAY password.',
    sources: [sources.taiwanAuthorization, sources.taiwanPrivacy],
  },
  ID: {
    id: 'ID_CONSIGNMENT_RECIPIENT',
    requirement: 'RECIPIENT_IDENTIFIER',
    customerHint: 'Indonesia consignment declarations need the recipient’s NPWP or an accepted alternative such as NIK or a foreign recipient’s passport. You may provide this directly to the carrier later. A format check does not confirm issuance or ownership.',
    sources: [sources.indonesiaConsignment, sources.indonesiaNik, sources.indonesiaNpwp],
  },
  JP: {
    id: 'JP_PERSONAL_IMPORT',
    requirement: 'NONE_BY_DEFAULT',
    customerHint: 'We do not collect a national ID for Japan at this stage. Customs or the courier may request an invoice, permits, or other documents based on the goods and clearance route.',
    sources: [sources.japanPersonalImports],
  },
  SG: {
    id: 'SG_PERSONAL_PARCEL',
    requirement: 'NONE_BY_DEFAULT',
    customerHint: 'We do not collect NRIC, FIN, or passport numbers for Singapore at this stage. The courier checks applicable permits and documents; do not use your national ID as a password.',
    sources: [sources.singaporeParcels, sources.singaporePrivacy],
  },
  HK: {
    id: 'HK_PERSONAL_IMPORT',
    requirement: 'NONE_BY_DEFAULT',
    customerHint: 'We do not collect a Hong Kong ID at this stage. The operator and courier still review declaration, licensing, and product restrictions for your shipment.',
    sources: [sources.hongKongDeclarations],
  },
  US: {
    id: 'US_ENTRY_SPECIFIC_IDENTIFICATION',
    requirement: 'ENTRY_SPECIFIC',
    customerHint: 'Some US entries require importer identification. If needed, the customs broker will arrange a secure process for an EIN, SSN, or CBP-assigned number. Do not enter an SSN or send identity documents to us here.',
    sources: [sources.usFormalEntry, sources.usImporterNumber],
  },
};

export function getCountryCustomsPolicy(country: string): CountryCustomsPolicy {
  const specific = countryPolicies[country];
  if (specific) return { ...specific, country, revision: POLICY_REVISION, reviewDueAt: POLICY_REVIEW_DUE_AT };
  return {
    id: 'MANUAL_DESTINATION_REVIEW', country, revision: POLICY_REVISION, reviewDueAt: null,
    requirement: 'MANUAL_REVIEW', sources: [],
    customerHint: 'Recipient and import requirements for this destination need a broker or carrier review. Save your address without national ID numbers. We will confirm whether we can fulfil the request before payment.',
  };
}

export function countryPolicyNeedsRefresh(country: string, now = Date.now()): boolean {
  const policy = getCountryCustomsPolicy(country);
  return !!policy.reviewDueAt && Date.parse(policy.reviewDueAt) <= now;
}
