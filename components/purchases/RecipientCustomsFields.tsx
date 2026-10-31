import type { DeliveryProfile } from '@/lib/purchases/schemas';
import { getCountryCustomsPolicy } from '@/lib/customs/country-policy';

interface Props {
  profile: DeliveryProfile;
  onChange: (key: keyof DeliveryProfile, value: string) => void;
}

export default function RecipientCustomsFields({ profile, onChange }: Props) {
  const policy = getCountryCustomsPolicy(profile.country);
  const numericId = ['NIK', 'NPWP'].includes(profile.customsIdType);
  return <section className="form-stack detail-section">
    <h2 className="section-heading">Recipient customs details</h2>
    <p className="notice">{policy.customerHint}</p>
    {profile.country === 'TW' && <label className="field">Recipient authorization route
      <select value={profile.customsAuthorization} required onChange={event => onChange('customsAuthorization', event.target.value)}>
        <option value="DEFERRED">Please review my authorization route</option>
        <option value="EZWAY">Recipient uses EZ WAY</option>
        <option value="BROKER">Recipient needs a broker authorization route</option>
      </select>
      <small>Registration is not shipment approval. The recipient must authorize the shipment when notified.</small>
    </label>}
    {profile.country === 'ID' && <>
      <label className="field">Indonesia recipient identifier
        <select value={profile.customsIdType} onChange={event => onChange('customsIdType', event.target.value)}>
          <option value="NONE">Provide securely to the carrier or broker later</option>
          <option value="NIK">NIK</option>
          <option value="NPWP">NPWP</option>
          <option value="PASSPORT">Passport (foreign recipient)</option>
        </select>
      </label>
      {profile.customsIdType === 'NONE' ? <label className="field">Who will handle the identifier?
        <select value={profile.customsAuthorization} onChange={event => onChange('customsAuthorization', event.target.value)}>
          <option value="DEFERRED">Carrier collection after review</option>
          <option value="BROKER">Customs broker</option>
        </select>
      </label> : <label className="field">{profile.customsIdType} number
        <input type="text" autoComplete="off" required inputMode={numericId ? 'numeric' : 'text'}
          maxLength={profile.customsIdType === 'NIK' ? 16 : profile.customsIdType === 'NPWP' ? 16 : 80}
          pattern={profile.customsIdType === 'NIK' ? '[0-9]{16}' : profile.customsIdType === 'NPWP' ? '[0-9]{15,16}' : undefined}
          value={profile.customsId} onChange={event => onChange('customsId', event.target.value)} />
        <small>{numericId ? 'Digits only. We check the shape; issuance and ownership still need review.' : 'Passport formats vary by issuing country. This value needs document review.'}</small>
      </label>}
    </>}
    {policy.sources.length > 0 && <div className="muted">
      Guidance checked {policy.sources[0].checkedAt}.{' '}
      <a href={policy.sources[0].url} target="_blank" rel="noopener noreferrer">Official guidance</a>
    </div>}
    <p className="muted">Do not upload identity documents, card details, or Korean personal customs codes here.</p>
  </section>;
}
