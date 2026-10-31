import type { CustomsSource } from './types';

export const POLICY_REVISION = '2026-10-12';
// Internal review deadline, not a legal expiry date or a guarantee of validity.
export const POLICY_REVIEW_DUE_AT = '2026-11-11T00:00:00.000Z';
function source(title: string, url: string): CustomsSource {
  return { title, url, checkedAt: POLICY_REVISION };
}

export const CUSTOMS_SOURCES = {
  taiwanAuthorization: source('Taiwan Customs: advance express authorization', 'https://web.customs.gov.tw/etaipei/singlehtml/1373?cntId=54256f557f204c46a2d25a77f34eac7a'),
  taiwanPrivacy: source('Taiwan Customs: EZ WAY registration and privacy', 'https://web.customs.gov.tw/singlehtml/3150?cntId=cus1_3150_3150_1471'),
  indonesiaConsignment: source('Indonesia Customs: consignment requirements', 'https://www.beacukai.go.id/faq-impor-barang-kiriman'),
  indonesiaNik: source('Indonesia: Government Regulation 40/2019, Article 31', 'https://disdukcapil.bandung.go.id/api/public/uploads/produk-hukum/PERATURAN_PEMERINTAH_REPUBLIK_INDONESIA_NOMOR_40_TAHUN_2019.pdf'),
  indonesiaNpwp: source('Indonesia Tax Authority: NPWP format transition', 'https://www.pajak.go.id/index.php/en/node/108724'),
  japanPersonalImports: source('Japan Customs: personal import clearance', 'https://www.customs.go.jp/english/c-answer_e/kojin/3002_e.htm'),
  singaporeParcels: source('Singapore Customs: courier and postal procedures', 'https://www.customs.gov.sg/personal-shipment/buying-from-overseas/courier-postal-procedures/'),
  singaporePrivacy: source('Singapore PDPC: national identifier collection', 'https://www.pdpc.gov.sg/guidelines-and-consultation/2020/02/advisory-guidelines-on-the-personal-data-protection-act-for-nric-and-other-national-identification-numbers/nric-faqs'),
  hongKongDeclarations: source('Hong Kong Customs: import declarations', 'https://www.customs.gov.hk/en/service-enforcement-information/cargo-clearance/import-export-declaration/'),
  usFormalEntry: source('US CBP: importer identification for formal entries', 'https://www.help.cbp.gov/s/article/Article-1118?language=en_US'),
  usImporterNumber: source('US CBP: assigned importer numbers', 'https://www.help.cbp.gov/s/article/Article-1066?language=en_US'),
} as const;
