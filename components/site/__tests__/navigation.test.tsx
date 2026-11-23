// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
const auth = vi.hoisted(() => ({ user: null as null | { id: string }, signOut: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({ usePathname: () => '/products', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/purchases/PurchaseClient', () => ({ usePurchaseClient: () => ({ href: (s: string) => s, preview: false }) }));
import SiteHeader from '../SiteHeader';
afterEach(() => { cleanup(); auth.user = null; });
describe('commerce navigation', () => {
  it('shows discovery and service guidance without old request tabs', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: 'Discover Korea' }).getAttribute('href')).toBe('/products');
    expect(screen.getByRole('link', { name: 'Paste a Link' }).getAttribute('href')).toBe('/');
    expect(within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole('link').map(link => link.textContent))
      .toEqual(['Paste a Link', 'Discover Korea', 'How It Works']);
    expect(screen.getByRole('link', { name: 'How It Works' }).getAttribute('href')).toBe('/guides/how-it-works');
    expect(screen.queryByRole('link', { name: 'Shipping & Returns' })).toBeNull();
    expect(screen.queryByText('New request')).toBeNull();
    expect(screen.queryByText('My requests')).toBeNull();
    expect(screen.queryByRole('link', { name: /^Orders/ })).toBeNull();
  });
  it('adds orders and account settings after sign-in', () => {
    auth.user = { id: 'owner' }; render(<SiteHeader />);
    expect(screen.getByRole('link', { name: /^Orders/ }).getAttribute('href')).toBe('/orders');
    expect(screen.getByRole('link', { name: 'Delivery details' })).toBeTruthy();
  });
});
