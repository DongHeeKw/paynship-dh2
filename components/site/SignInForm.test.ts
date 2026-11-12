// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signInWithEmail: vi.fn(),
  search: '',
  appleAvailable: true,
  naverAvailable: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, signIn: mocks.signIn }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('@/lib/auth/customer-auth', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/auth/customer-auth')>(),
  signInWithEmail: mocks.signInWithEmail,
}));

vi.mock('@/lib/auth/customer-social', () => ({
  getCustomerSocialProviderStatus: (provider: string) => {
    const available = provider === 'google' || (provider === 'apple' ? mocks.appleAvailable : mocks.naverAvailable);
    const name = provider === 'apple' ? 'Apple' : 'Naver';
    return { available, message: available ? undefined : `${name} sign-in is coming soon. Please use another option.` };
  },
}));

import SignInForm from './SignInForm';

afterEach(() => {
  vi.resetAllMocks();
  mocks.search = '';
  mocks.appleAvailable = true;
  mocks.naverAvailable = false;
  window.history.replaceState(null, '', '/');
});

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement;
}

describe('SignInForm', () => {
  it.each([
    ['login', 'google', 'Google'], ['signup', 'google', 'Google'],
    ['login', 'apple', 'Apple'], ['signup', 'apple', 'Apple'],
    ['login', 'naver', 'Naver'], ['signup', 'naver', 'Naver'],
  ] as const)('starts %s using %s with the validated return path', async (mode, provider, name) => {
    mocks.search = 'next=%2Forders%3Fstatus%3Dopen';
    mocks.naverAvailable = true;
    render(React.createElement(SignInForm, { mode }));

    fireEvent.click(button(`Continue with ${name}`));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith('/orders?status=open', provider));
    expect(button(`Opening ${name}…`).getAttribute('aria-busy')).toBe('true');
  });

  it('uses the internal fallback when a social login receives an external return path', async () => {
    mocks.search = 'next=https%3A%2F%2Fexternal.example%2F';
    render(React.createElement(SignInForm));

    fireEvent.click(button('Continue with Apple'));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith('/orders', 'apple'));
  });

  it.each(['login', 'signup'] as const)('explains unavailable Apple and Naver on %s without starting OAuth', mode => {
    mocks.appleAvailable = false;
    render(React.createElement(SignInForm, { mode }));

    for (const name of ['Apple', 'Naver']) {
      const socialButton = button(`Continue with ${name}`);
      expect(socialButton.disabled).toBe(true);
      const descriptionId = socialButton.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();
      expect(document.getElementById(descriptionId!)?.textContent).toBe(`${name} sign-in is coming soon. Please use another option.`);
      fireEvent.click(socialButton);
    }
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(button('Continue with Google').disabled).toBe(false);
    expect(button(mode === 'login' ? 'Sign in with email' : 'Create account with email').disabled).toBe(false);
  });

  it('blocks repeated clicks, other providers, and email submission while OAuth opens', () => {
    mocks.naverAvailable = true;
    mocks.signIn.mockReturnValue(new Promise<void>(() => {}));
    const { container } = render(React.createElement(SignInForm));

    fireEvent.click(button('Continue with Apple'));
    fireEvent.click(button('Opening Apple…'));
    fireEvent.click(button('Continue with Google'));
    fireEvent.click(button('Continue with Naver'));
    fireEvent.submit(container.querySelector('form')!);

    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithEmail).not.toHaveBeenCalled();
    for (const element of container.querySelectorAll('button, input')) {
      expect((element as HTMLButtonElement | HTMLInputElement).disabled).toBe(true);
    }
  });

  it('blocks OAuth and repeated form submissions while email login is pending', () => {
    mocks.signInWithEmail.mockReturnValue(new Promise(() => {}));
    const { container } = render(React.createElement(SignInForm));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'customer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-123' } });

    fireEvent.submit(container.querySelector('form')!);
    fireEvent.submit(container.querySelector('form')!);
    fireEvent.click(button('Continue with Google'));
    fireEvent.click(button('Continue with Apple'));

    expect(mocks.signInWithEmail).toHaveBeenCalledTimes(1);
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(button('Signing you in…').disabled).toBe(true);
    expect(button('Continue with Apple').disabled).toBe(true);
  });

  it('explains an OAuth callback failure and how to recover', () => {
    mocks.search = 'error=callback';
    render(React.createElement(SignInForm));

    expect(screen.getByRole('alert').textContent).toContain('sign-in link couldn’t be completed');
    expect(button('Continue with Google').disabled).toBe(false);
  });

  it('explains the verified confirmation notice without echoing provider parameters', () => {
    mocks.search = 'notice=confirm-email&error=callback&error_description=untrusted-provider-message';
    render(React.createElement(SignInForm));

    expect(screen.getByRole('status').textContent).toContain('Check your email to finish signing in.');
    expect(screen.queryByText('untrusted-provider-message')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the known email confirmation error from the fragment and clears the fragment', () => {
    mocks.search = 'error=callback&next=%2Fpurchase';
    window.history.replaceState(null, '', '/login?error=callback&next=%2Fpurchase#error_code=provider_email_needs_verification&error_description=untrusted-provider-message');
    render(React.createElement(SignInForm));

    expect(screen.getByRole('status').textContent).toContain('Check your email to finish signing in.');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('untrusted-provider-message')).toBeNull();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname + window.location.search).toBe('/login?error=callback&next=%2Fpurchase');
  });

  it('does not treat unrelated fragment data as a confirmation notice or session', () => {
    window.history.replaceState(null, '', '/login#error_code=other&access_token=untrusted-token');
    render(React.createElement(SignInForm));

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('untrusted-token')).toBeNull();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('shows the existing provider error and lets a customer retry with another provider', async () => {
    mocks.signIn.mockRejectedValueOnce(new Error('Sign in could not start. Please try again.'));
    render(React.createElement(SignInForm));

    fireEvent.click(button('Continue with Google'));

    expect((await screen.findByRole('alert')).textContent).toContain('Sign in could not start');
    expect(button('Continue with Google').disabled).toBe(false);
    expect(button('Continue with Apple').disabled).toBe(false);

    fireEvent.click(button('Continue with Apple'));

    await waitFor(() => expect(mocks.signIn).toHaveBeenLastCalledWith('/orders', 'apple'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
