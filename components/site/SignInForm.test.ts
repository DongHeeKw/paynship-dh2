// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  search: '',
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, signIn: mocks.signIn }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

import SignInForm from './SignInForm';

afterEach(() => {
  vi.resetAllMocks();
  mocks.search = '';
});

describe('SignInForm', () => {
  it('starts Google OAuth with the validated return path', async () => {
    mocks.search = 'next=%2Forders%3Fstatus%3Dopen';
    render(React.createElement(SignInForm));

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith('/orders?status=open'));
  });

  it('explains an OAuth callback failure and how to recover', () => {
    mocks.search = 'error=callback';
    render(React.createElement(SignInForm));

    expect(screen.getByRole('alert').textContent).toContain('Google sign-in did not complete');
    expect((screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows an error when the OAuth provider could not be opened', async () => {
    mocks.signIn.mockRejectedValue(new Error('Sign in could not start. Please try again.'));
    render(React.createElement(SignInForm));

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Sign in could not start');
    expect((screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
