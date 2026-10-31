// @vitest-environment jsdom
import { randomUUID } from 'node:crypto';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DevPreviewWorkspace from '@/components/purchases/DevPreviewWorkspace';
import { INTAKE_DRAFT_STORAGE_KEY, saveIntakeDraft, type IntakeDraft } from '@/lib/purchases/intake-draft';

const route = vi.hoisted(() => ({ params: new URLSearchParams(), router: { push: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => route.router, useSearchParams: () => route.params }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: unknown }) => createElement('a', { ...props, href }, children as never) }));
vi.mock('@/components/site/SiteShell', () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));

const entered: IntakeDraft = {
  sourceUrl: 'https://brand.naver.com/kinox/products/5912828061?site_preference=device&NaPm=tracking',
  category: 'household', quantity: 3, options: 'Black, 24 cm', destination: 'SG',
};

beforeEach(() => {
  route.params = new URLSearchParams(); route.router.push.mockClear();
  window.sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn()); vi.stubGlobal('crypto', { randomUUID });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function expectFields(draft: IntakeDraft) {
  expect((screen.getByLabelText('Product link') as HTMLInputElement).value).toBe(draft.sourceUrl);
  expect((screen.getByLabelText('Product category') as HTMLSelectElement).value).toBe(draft.category);
  expect((screen.getByLabelText('Quantity') as HTMLInputElement).value).toBe(String(draft.quantity));
  expect((screen.getByLabelText('Options') as HTMLTextAreaElement).value).toBe(draft.options);
  expect((screen.getByLabelText('Destination country') as HTMLSelectElement).value).toBe(draft.destination);
}

describe('preview product form integration', () => {
  it('preserves entered Naver fields through navigation and local submission without writing public storage', async () => {
    saveIntakeDraft(window.sessionStorage, entered);
    const original = window.sessionStorage.getItem(INTAKE_DRAFT_STORAGE_KEY);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    const rendered = render(createElement(DevPreviewWorkspace));
    await waitFor(() => expectFields(entered));
    fireEvent.change(screen.getByLabelText('Options'), { target: { value: 'Changed locally' } });

    route.params = new URLSearchParams('view=delivery'); rendered.rerender(createElement(DevPreviewWorkspace));
    await screen.findByLabelText('Recipient name');
    route.params = new URLSearchParams(); rendered.rerender(createElement(DevPreviewWorkspace));
    await waitFor(() => expectFields({ ...entered, options: 'Changed locally' }));

    await waitFor(() => expect((screen.getByRole('button', { name: 'Submit request' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(route.router.push).toHaveBeenCalled());
    const detailUrl = route.router.push.mock.calls.at(-1)![0] as string;
    route.params = new URL(detailUrl, 'http://localhost').searchParams;
    rendered.rerender(createElement(DevPreviewWorkspace));
    await screen.findByText('Your local preview request');
    expect(screen.queryByText('Preset example: book request')).toBeNull();

    route.params = new URLSearchParams(); rendered.rerender(createElement(DevPreviewWorkspace));
    await waitFor(() => expectFields({ ...entered, options: 'Changed locally' }));
    expect(window.sessionStorage.getItem(INTAKE_DRAFT_STORAGE_KEY)).toBe(original);
    expect(write).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();

    rendered.unmount(); render(createElement(DevPreviewWorkspace));
    await waitFor(() => expectFields(entered));
  });

  it('does not prefill a book unless the explicit example button is clicked', async () => {
    render(createElement(DevPreviewWorkspace));
    await waitFor(() => expect((screen.getByLabelText('Product link') as HTMLInputElement).value).toBe(''));
    fireEvent.click(screen.getByRole('button', { name: 'Use a Yes24 book example' }));
    await waitFor(() => expect((screen.getByLabelText('Product link') as HTMLInputElement).value).toBe('https://www.yes24.com/product/goods/13137546'));
    expect(window.sessionStorage.getItem(INTAKE_DRAFT_STORAGE_KEY)).toBeNull();
  });
});
