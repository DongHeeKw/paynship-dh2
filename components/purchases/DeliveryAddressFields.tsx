import type { DeliveryProfile } from '@/lib/purchases/schemas';
import { DESTINATIONS } from '@/lib/purchases/countries';
import { countryName } from './labels';
import { getPostalInputPolicy } from '@/lib/customs/postal-policy';

interface Props {
  profile: DeliveryProfile;
  onChange: (key: keyof DeliveryProfile, value: string) => void;
}

export default function DeliveryAddressFields({ profile, onChange }: Props) {
  const postal = getPostalInputPolicy(profile.country);
  return <>
    <div className="field-grid">
      <label className="field">Recipient name
        <input autoComplete="name" required minLength={2} maxLength={100} value={profile.fullName} onChange={event => onChange('fullName', event.target.value)} />
      </label>
      <label className="field">Phone, including country code
        <input type="tel" autoComplete="tel" required pattern="\+[1-9][0-9]{6,14}" maxLength={16} placeholder="+819012345678" value={profile.phone} onChange={event => onChange('phone', event.target.value)} />
        <small>Use + and country code, without spaces. This does not verify phone ownership.</small>
      </label>
    </div>
    <label className="field">Destination country
      <select autoComplete="country" value={profile.country} onChange={event => onChange('country', event.target.value)}>
        {DESTINATIONS.map(code => <option key={code} value={code}>{countryName(code)}</option>)}
      </select>
      <small>Product eligibility and shipping availability are confirmed during review.</small>
    </label>
    <label className="field">Street address
      <input autoComplete="address-line1" required minLength={3} maxLength={200} value={profile.address1} onChange={event => onChange('address1', event.target.value)} />
    </label>
    <label className="field">Apartment, suite, or building (optional)
      <input autoComplete="address-line2" maxLength={200} value={profile.address2} onChange={event => onChange('address2', event.target.value)} />
    </label>
    <div className="field-grid">
      <label className="field">City
        <input autoComplete="address-level2" required maxLength={100} value={profile.city} onChange={event => onChange('city', event.target.value)} />
      </label>
      <label className="field">State, province, or region (optional)
        <input autoComplete="address-level1" maxLength={100} value={profile.region} onChange={event => onChange('region', event.target.value)} />
      </label>
      <label className="field">Postal code{!postal.required && ' (optional)'}
        <input autoComplete="postal-code" required={postal.required} pattern={postal.pattern} maxLength={20} value={profile.postalCode} onChange={event => onChange('postalCode', event.target.value)} />
        <small>{postal.hint}</small>
      </label>
    </div>
  </>;
}
