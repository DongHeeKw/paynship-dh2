import { z } from 'zod';
import { DESTINATIONS } from '@/lib/purchases/countries';
import { CUSTOMS_AUTHORIZATIONS, CUSTOMS_ID_TYPES } from './types';
import { validateRecipientCustomsInput } from './identifier';
import { internationalPhoneSchema, singleLineText } from './contact-validation';
import { normalizePostalCode, postalCodeFormatValid, getPostalInputPolicy } from './postal-policy';

export const deliveryProfileSchema = z.object({
  fullName: singleLineText(2, 100),
  phone: internationalPhoneSchema,
  country: z.enum(DESTINATIONS),
  address1: singleLineText(3, 200),
  address2: singleLineText(0, 200).default(''),
  city: singleLineText(1, 100),
  region: singleLineText(0, 100).default(''),
  postalCode: singleLineText(0, 20).default(''),
  customsId: singleLineText(0, 80).default(''),
  customsIdType: z.enum(CUSTOMS_ID_TYPES).default('NONE'),
  customsAuthorization: z.enum(CUSTOMS_AUTHORIZATIONS).default('NONE'),
}).strict().superRefine((profile, ctx) => {
  validateRecipientCustomsInput(profile, ctx);
  if (!postalCodeFormatValid(profile.country, profile.postalCode)) {
    ctx.addIssue({ code: 'custom', path: ['postalCode'], message: getPostalInputPolicy(profile.country).hint });
  }
}).transform(profile => ({ ...profile, postalCode: normalizePostalCode(profile.country, profile.postalCode) }));

export type DeliveryProfile = z.infer<typeof deliveryProfileSchema>;
