import type { DeliveryProfile } from '@/lib/purchases/schemas';
import JourneyIllustration from '@/components/home/JourneyIllustration';
import { countryName } from './labels';

export default function DeliveryAddressPreview({ profile }: { profile: DeliveryProfile }) {
  const lines = [profile.address1, profile.address2, [profile.city, profile.region, profile.postalCode].filter(Boolean).join(', ')].filter(Boolean);
  return <aside className="delivery-preview" aria-label="Address preview">
    <div className="delivery-preview-art"><JourneyIllustration step="delivery" /><span aria-hidden="true">Next stop,<br />your doorstep.</span></div>
    <div className="delivery-label"><div className="delivery-label-heading"><span>DELIVER TO</span><svg width="43" height="20" viewBox="0 0 43 20" aria-hidden="true" fill="currentColor"><path d="M0 0h2v20H0zm4 0h1v20H4zm4 0h3v20H8zm5 0h1v20h-1zm4 0h2v20h-2zm4 0h1v20h-1zm4 0h3v20h-3zm5 0h1v20h-1zm4 0h2v20h-2zm5 0h4v20h-4z" /></svg></div><strong>{profile.fullName || 'Your recipient name'}</strong>{lines.length ? lines.map((line, index) => <p key={index}>{line}</p>) : <p>Your address will appear here.</p>}<p className="delivery-label-country">{countryName(profile.country)}</p></div>
    <div className="delivery-preview-note"><strong>A little care with your details.</strong><p>This label previews what you enter. Your address and product are reviewed before shipping.</p><p>Saving details here won’t change addresses on existing requests.</p></div>
  </aside>;
}
