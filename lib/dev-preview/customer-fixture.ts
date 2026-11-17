import { buildStoredDeliveryProfile } from '@/lib/customs/delivery';

// Deliberately fictional. No real customer, identity number or payment record.
export function previewCustomer() {
  return buildStoredDeliveryProfile({
    fullName: 'Example Recipient', phone: '+819012345678', country: 'JP',
    address1: '1 Sample Road', address2: '', city: 'Tokyo', region: '', postalCode: '100-0001',
    customsId: '', customsIdType: 'NONE', customsAuthorization: 'NONE',
  });
}
