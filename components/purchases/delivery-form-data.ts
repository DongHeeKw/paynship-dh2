import type { DeliveryProfile } from '@/lib/purchases/schemas';

export const EMPTY_DELIVERY_PROFILE: DeliveryProfile = {
  fullName: '', phone: '', country: 'JP', address1: '', address2: '', city: '',
  region: '', postalCode: '', customsId: '', customsIdType: 'NONE', customsAuthorization: 'NONE',
};

export function changeDeliveryCountry(profile: DeliveryProfile, country: DeliveryProfile['country']): DeliveryProfile {
  return {
    ...profile, country, customsId: '', customsIdType: 'NONE',
    customsAuthorization: ['TW', 'ID'].includes(country) ? 'DEFERRED' : 'NONE',
  };
}
