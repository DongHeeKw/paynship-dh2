// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
import HomeExperience from '@/components/home/HomeExperience';
import ProductCatalog from '@/features/storefront/products/ProductCatalog';
import HowItWorksGuide from '@/components/guides/HowItWorksGuide';

function markup(element: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(element);
  return root;
}
it('keeps Paste a Link focused on customer URL entry and the parcel world', () => {
  const home = markup(<HomeExperience />);
  expect(home.querySelector('input[type="url"]')).not.toBeNull();
  expect(home.querySelector('.parcel-world')).not.toBeNull();
  expect(home.querySelector('.discovery-card, .product-card')).toBeNull();
  expect(home.querySelector('.parcel-faq')).toBeNull();
  expect(home.querySelector('a[href="/guides/how-it-works"]')).not.toBeNull();
});
it('keeps Discover Korea focused on merchandise without a URL-entry prompt', () => {
  const catalog = markup(<ProductCatalog />);
  expect(catalog.querySelectorAll('.product-card')).toHaveLength(4);
  expect(catalog.querySelector('input[type="url"]')).toBeNull();
  expect(catalog.querySelector('a[href="/purchase"]')).toBeNull();
  expect(catalog.querySelector('select[aria-label="Shopping destination"]')).not.toBeNull();
});
it('puts buying, costs, shipping, returns and questions in the same guide', () => {
  const guide = markup(<HowItWorksGuide />);
  for (const id of ['buying', 'costs', 'shipping-and-returns', 'returns', 'questions']) {
    expect(guide.querySelector(`#${id}`)).not.toBeNull();
    expect(guide.querySelector(`a[href="#${id}"]`)).not.toBeNull();
  }
  expect(guide.textContent).toContain('Combined shipping is not currently available to book.');
  expect(guide.textContent).toContain('Refunds after payment cannot be processed automatically yet');
  expect(guide.querySelector('input[type="url"]')).toBeNull();
});
