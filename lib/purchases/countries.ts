// Request destinations. Availability is confirmed by an operator, not promised here.
export const DESTINATIONS = ['JP', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'CN', 'IN', 'US', 'CA', 'AU', 'NZ', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE', 'PT', 'AE', 'SA', 'MX', 'BR'] as const;

// Explicit labels keep SSR and browser output identical across ICU versions.
export const COUNTRY_NAMES: Record<typeof DESTINATIONS[number], string> = {
  JP: 'Japan', TW: 'Taiwan', HK: 'Hong Kong', SG: 'Singapore', MY: 'Malaysia',
  TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines', ID: 'Indonesia', CN: 'China',
  IN: 'India', US: 'United States', CA: 'Canada', AU: 'Australia', NZ: 'New Zealand',
  GB: 'United Kingdom', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain',
  NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', CZ: 'Czechia',
  IE: 'Ireland', PT: 'Portugal', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
  MX: 'Mexico', BR: 'Brazil',
};
