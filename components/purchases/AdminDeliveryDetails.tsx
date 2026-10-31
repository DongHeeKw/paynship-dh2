import type { DeliveryProfile } from '@/lib/purchases/schemas';
import { countryName } from './labels';
export default function AdminDeliveryDetails({ delivery }: { delivery: DeliveryProfile }) {
  return <section className="detail-section"><h2 className="section-heading">Recipient details</h2><dl className="detail-grid"><dt>Name</dt><dd>{delivery.fullName}</dd><dt>Phone</dt><dd>{delivery.phone}</dd><dt>Address</dt><dd>{delivery.address1}<br />{delivery.address2 && <>{delivery.address2}<br /></>}{delivery.city}, {delivery.region} {delivery.postalCode}<br />{countryName(delivery.country)}</dd><dt>Customs identifier</dt><dd>{delivery.customsId || 'Not provided'}</dd></dl></section>;
}
