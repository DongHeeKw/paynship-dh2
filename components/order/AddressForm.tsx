'use client';

import { useState, useEffect } from 'react';
import { getAvailableCountries } from '@/lib/calculator/shipping';
import { useLanguage } from '@/lib/i18n';

export interface AddressData {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

interface AddressFormProps {
  onSubmit: (address: AddressData) => void | Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<AddressData>;
  isSubmitting?: boolean;
}

export default function AddressForm({ onSubmit, onCancel, initialData, isSubmitting = false }: AddressFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<AddressData>({
    street: initialData?.street || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postalCode: initialData?.postalCode || '',
    country: initialData?.country || '',
    countryCode: initialData?.countryCode || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AddressData, string>>>({});
  const availableCountries = getAvailableCountries();

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressData, string>> = {};

    if (!formData.street.trim()) {
      newErrors.street = t.address.streetRequired;
    }
    if (!formData.city.trim()) {
      newErrors.city = t.address.cityRequired;
    }
    if (!formData.state.trim()) {
      newErrors.state = t.address.stateRequired;
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = t.address.postalRequired;
    }
    if (!formData.countryCode) {
      newErrors.countryCode = t.address.countryRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountryCode = e.target.value;
    const selectedCountry = availableCountries.find(c => c.countryCode === selectedCountryCode);

    setFormData({
      ...formData,
      countryCode: selectedCountryCode,
      country: selectedCountry?.country || '',
    });
  };

  return (
    <div className="pn-card-soft p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--pn-brand)_0%,#1f2430_100%)] text-white shadow-[0_14px_28px_rgba(0,55,100,0.18)]">
          <i className="fas fa-map-marker-alt text-white"></i>
        </div>
        <h3 className="text-2xl font-bold text-[var(--pn-ink)]">
          {t.address.title}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Country Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--pn-ink-soft)]">
            {t.address.country} <span className="text-[var(--pn-danger)]">*</span>
          </label>
          <select
            value={formData.countryCode}
            onChange={handleCountryChange}
            className="w-full rounded-xl border border-[var(--pn-border)] bg-white px-4 py-3 text-[var(--pn-ink)] transition-all focus:border-[var(--pn-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pn-brand-soft)]"
          >
            <option value="">{t.address.selectCountry}</option>
            {availableCountries.map((country) => (
              <option key={country.countryCode} value={country.countryCode}>
                {country.country} ({country.countryCode})
              </option>
            ))}
          </select>
          {errors.countryCode && (
            <p className="mt-1 text-sm text-[var(--pn-danger)]">{errors.countryCode}</p>
          )}
        </div>

        {/* Street Address */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--pn-ink-soft)]">
            {t.address.street} <span className="text-[var(--pn-danger)]">*</span>
          </label>
          <input
            type="text"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            placeholder="123 Main St, Apt 4B"
            className="w-full rounded-xl border border-[var(--pn-border)] bg-white px-4 py-3 text-[var(--pn-ink)] placeholder:text-[var(--pn-ink-muted)] transition-all focus:border-[var(--pn-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pn-brand-soft)]"
          />
          {errors.street && (
            <p className="mt-1 text-sm text-[var(--pn-danger)]">{errors.street}</p>
          )}
        </div>

        {/* City and State */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--pn-ink-soft)]">
              {t.address.city} <span className="text-[var(--pn-danger)]">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New York"
              className="w-full rounded-xl border border-[var(--pn-border)] bg-white px-4 py-3 text-[var(--pn-ink)] placeholder:text-[var(--pn-ink-muted)] transition-all focus:border-[var(--pn-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pn-brand-soft)]"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-[var(--pn-danger)]">{errors.city}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--pn-ink-soft)]">
              {t.address.state} <span className="text-[var(--pn-danger)]">*</span>
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="NY"
              className="w-full rounded-xl border border-[var(--pn-border)] bg-white px-4 py-3 text-[var(--pn-ink)] placeholder:text-[var(--pn-ink-muted)] transition-all focus:border-[var(--pn-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pn-brand-soft)]"
            />
            {errors.state && (
              <p className="mt-1 text-sm text-[var(--pn-danger)]">{errors.state}</p>
            )}
          </div>
        </div>

        {/* Postal Code */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--pn-ink-soft)]">
            {t.address.zipCode} <span className="text-[var(--pn-danger)]">*</span>
          </label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            placeholder="10001"
            className="w-full rounded-xl border border-[var(--pn-border)] bg-white px-4 py-3 text-[var(--pn-ink)] placeholder:text-[var(--pn-ink-muted)] transition-all focus:border-[var(--pn-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pn-brand-soft)]"
          />
          {errors.postalCode && (
            <p className="mt-1 text-sm text-[var(--pn-danger)]">{errors.postalCode}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="pn-button-primary flex-1 px-6 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {t.address.calculating}
              </>
            ) : (
              <>
                <i className="fas fa-arrow-right mr-2"></i>
                {t.address.continueToQuote}
              </>
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="pn-button-secondary px-6 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
          )}
        </div>
      </form>

      {/* Info Note */}
      <div className="mt-6 rounded-[20px] border border-[var(--pn-brand-soft)] bg-[var(--pn-brand-soft)] p-4">
        <div className="flex gap-3">
          <i className="fas fa-info-circle mt-1 text-[var(--pn-brand)]"></i>
          <div className="flex-1">
            <p className="text-sm text-[var(--pn-ink-soft)]">
              {t.address.infoNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
