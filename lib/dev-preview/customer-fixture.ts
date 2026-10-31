import { buildStoredDeliveryProfile } from '@/lib/customs/delivery';

// Deliberately fictional. No real customer, identity number or payment record.
export function previewCustomer() {
  return buildStoredDeliveryProfile({
    fullName: 'Example Recipient', phone: '+6591234567', country: 'SG',
    address1: '1 Sample Road', address2: '', city: 'Singapore', region: '', postalCode: '018956',
    customsId: '', customsIdType: 'NONE', customsAuthorization: 'NONE',
  });
}
