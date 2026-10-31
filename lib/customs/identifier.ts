import type { RefinementCtx } from 'zod';
import type { CustomsAuthorization, CustomsIdType } from './types';

export interface RecipientCustomsInput {
  country: string;
  customsId: string;
  customsIdType: CustomsIdType;
  customsAuthorization: CustomsAuthorization;
}

// These checks describe the documented numeric shapes only. There is no issuer
// query, checksum, or verification that the number belongs to the recipient.
export function validateRecipientCustomsInput(input: RecipientCustomsInput, ctx: RefinementCtx) {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (input.country !== 'ID' && (input.customsId || input.customsIdType !== 'NONE')) {
    issue('customsId', 'Do not enter a personal customs or national ID for this destination here.');
  }
  if (input.country === 'TW') {
    if (!['EZWAY', 'BROKER', 'DEFERRED'].includes(input.customsAuthorization)) issue('customsAuthorization', 'Select the recipient authorization route for Taiwan.');
  } else if (input.customsAuthorization === 'EZWAY') {
    issue('customsAuthorization', 'EZ WAY is only a Taiwan recipient authorization route.');
  }
  if (input.country === 'ID') {
    if (input.customsIdType === 'NONE') {
      if (input.customsId) issue('customsId', 'Choose an identifier type before entering a number.');
      if (!['BROKER', 'DEFERRED'].includes(input.customsAuthorization)) issue('customsAuthorization', 'Select carrier or broker handling when providing the identifier later.');
    } else {
      if (!input.customsId) issue('customsId', 'Enter the selected recipient identifier or choose to provide it later.');
      if (input.customsAuthorization !== 'NONE') issue('customsAuthorization', 'Choose either an identifier here or external carrier/broker handling.');
      if (input.customsIdType === 'NIK' && !/^\d{16}$/.test(input.customsId)) issue('customsId', 'NIK must contain 16 digits. This checks format only.');
      if (input.customsIdType === 'NPWP' && !/^\d{15,16}$/.test(input.customsId)) issue('customsId', 'Enter the 15 or 16 NPWP digits without separators. The carrier must confirm the accepted format.');
      // Passport formats depend on the issuing country. Bounded text is not a
      // passport format or identity check, so this route stays REVIEW_REQUIRED.
    }
  }
}
