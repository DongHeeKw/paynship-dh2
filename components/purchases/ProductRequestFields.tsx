import { useId } from 'react';
import { PRODUCT_CATEGORIES } from '@/lib/purchases/categories';
import { DESTINATIONS } from '@/lib/purchases/countries';
import type { IntakeDraft } from '@/lib/purchases/intake-draft';
import { CATEGORY_LABELS, countryName } from './labels';

interface Props { draft: IntakeDraft; onChange: (patch: Partial<IntakeDraft>) => void }

export default function ProductRequestFields({ draft, onChange }: Props) {
  const fieldId = useId();
  return <>
    <div className="field">
      <label htmlFor={`${fieldId}-url`}>Product link</label>
      <input id={`${fieldId}-url`} type="url" required maxLength={2048} value={draft.sourceUrl} placeholder="Paste a supported product URL" onChange={event => onChange({ sourceUrl: event.target.value })} />
    </div>
    <div className="field-grid">
      <div className="field">
        <label htmlFor={`${fieldId}-category`}>Product category</label>
        <select id={`${fieldId}-category`} value={draft.category} onChange={event => onChange({ category: event.target.value as IntakeDraft['category'] })}>
          {PRODUCT_CATEGORIES.map(item => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${fieldId}-quantity`}>Quantity</label>
        <input id={`${fieldId}-quantity`} type="number" min={1} max={10} required value={Number.isFinite(draft.quantity) ? draft.quantity : ''} onChange={event => onChange({ quantity: event.target.valueAsNumber })} />
      </div>
    </div>
    <div className="field">
      <label htmlFor={`${fieldId}-options`}>Options</label>
      <textarea id={`${fieldId}-options`} aria-describedby={`${fieldId}-options-hint`} maxLength={500} value={draft.options} placeholder="Size, colour, model, or other seller options" onChange={event => onChange({ options: event.target.value })} />
      <small id={`${fieldId}-options-hint`}>Product options only. Do not enter an address or identity number.</small>
    </div>
    <div className="field">
      <label htmlFor={`${fieldId}-destination`}>Destination country</label>
      <select id={`${fieldId}-destination`} required value={draft.destination} onChange={event => onChange({ destination: event.target.value as IntakeDraft['destination'] })}>
        <option value="">Choose a destination</option>
        {DESTINATIONS.map(code => <option key={code} value={code}>{countryName(code)}</option>)}
      </select>
    </div>
  </>;
}
