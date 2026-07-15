import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
} from '@/components/auth/auth-forms';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

const accountMocks = vi.hoisted(() => ({
  fetchAccountProfile: vi.fn(),
  patchAccountProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => navigationMocks,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: authMocks,
  }),
}));

vi.mock('@/configs/api/query-config', () => ({
  default: {
    fetchAccountProfile: accountMocks.fetchAccountProfile,
  },
}));

vi.mock('@/configs/api/mutation-config', () => ({
  default: {
    patchAccountProfile: accountMocks.patchAccountProfile,
  },
}));

describe('customer auth forms', () => {
  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset());
    Object.values(navigationMocks).forEach((mock) => mock.mockReset());
    Object.values(accountMocks).forEach((mock) => mock.mockReset());
    authMocks.signInWithOAuth.mockResolvedValue({ error: null });
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({ error: null });
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMocks.updateUser.mockResolvedValue({ error: null });
    authMocks.signOut.mockResolvedValue({ error: null });
    authMocks.getSession.mockResolvedValue({ data: { session: { access_token: 'recovery' } }, error: null });
    accountMocks.fetchAccountProfile.mockResolvedValue({ data: { data: {} } });
    window.sessionStorage.clear();
  });

  it('keeps Google before the divider and email fields, with native validation disabled', () => {
    const { container } = render(<SignInForm next="/account" />);
    const google = screen.getByRole('button', { name: 'Continue with Google' });
    const divider = screen.getByText('or');
    const email = screen.getByLabelText('Email');

    expect(google.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('form')).toHaveAttribute('novalidate');
    expect(email).not.toHaveAttribute('required');
  });

  it('keeps the Google OAuth trigger wired to the safe callback flow', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account/orders" />);

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringMatching(/\/auth\/callback\?next=%2Faccount%2Forders$/),
      },
    });
  });

  it('validates required and malformed email after blur and clears after correction', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account" />);
    const email = screen.getByLabelText('Email');

    fireEvent.blur(email);
    expect(await screen.findByText('Email is required.')).toBeVisible();
    expect(email).toHaveAttribute('aria-invalid', 'true');

    await user.type(email, 'not-an-email');
    fireEvent.blur(email);
    expect(await screen.findByText('Enter a valid email address.')).toBeVisible();

    await user.clear(email);
    await user.type(email, 'customer@example.com');
    await waitFor(() => expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument());
    expect(email).toHaveAttribute('aria-invalid', 'false');
  });

  it('validates password after blur, focuses the first invalid field, and blocks invalid submission', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account" />);
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');
    const submit = screen.getByRole('button', { name: 'Login' });

    await user.type(password, 'abc1');
    fireEvent.blur(password);
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeVisible();
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();

    fireEvent.submit(submit.closest('form')!);
    await waitFor(() => expect(email).toHaveFocus());
  });

  it('clears password errors after a valid correction and signs in with email and password', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account/orders" />);
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');

    await user.type(email, 'customer@example.com');
    fireEvent.blur(email);
    await user.type(password, 'short1');
    fireEvent.blur(password);
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeVisible();

    await user.clear(password);
    await user.type(password, 'valid123');
    await waitFor(() => expect(screen.queryByText('Password must be at least 8 characters.')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'customer@example.com',
      password: 'valid123',
    }));
    expect(navigationMocks.replace).toHaveBeenCalledWith('/account/orders');
  });

  it('never renders raw Supabase sign-in errors', async () => {
    const user = userEvent.setup();
    authMocks.signInWithPassword.mockResolvedValue({
      error: { code: 'unexpected', message: 'sensitive raw Supabase detail', status: 503 },
    });
    render(<SignInForm next="/account" />);

    await user.type(screen.getByLabelText('Email'), 'customer@example.com');
    fireEvent.blur(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Password'), 'valid123');
    fireEvent.blur(screen.getByLabelText('Password'));
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not sign you in right now. Please try again.');
    expect(screen.queryByText('sensitive raw Supabase detail')).not.toBeInTheDocument();
  });

  it('sign-up uses one password field and updates every accessible requirement live', async () => {
    const user = userEvent.setup();
    render(<SignUpForm next="/account" />);
    const passwordInputs = screen.getAllByLabelText('Password');
    expect(passwordInputs).toHaveLength(1);
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();

    const checklist = screen.getByRole('list', { name: 'Password requirements' });
    const minimum = within(checklist).getByText('At least 8 characters').closest('li');
    const letter = within(checklist).getByText('Contains a letter').closest('li');
    const number = within(checklist).getByText('Contains a number').closest('li');
    expect(minimum).toHaveAttribute('data-state', 'unmet');

    await user.type(passwordInputs[0], 'abcdefgh');
    expect(minimum).toHaveAttribute('data-state', 'met');
    expect(letter).toHaveAttribute('data-state', 'met');
    expect(number).toHaveAttribute('data-state', 'unmet');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(authMocks.signUp).not.toHaveBeenCalled();

    await user.type(passwordInputs[0], '1');
    expect(number).toHaveAttribute('data-state', 'met');
    expect(checklist).toHaveTextContent('Met: Contains a number');
  });

  it('routes a valid signup to check-email', async () => {
    const user = userEvent.setup();
    render(<SignUpForm next="/cart" />);
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    fireEvent.blur(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Password'), 'valid123');
    fireEvent.blur(screen.getByLabelText('Password'));
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => expect(authMocks.signUp).toHaveBeenCalled());
    expect(navigationMocks.push).toHaveBeenCalledWith('/account/check-email?next=%2Fcart');
  });

  it('forgot-password validates email on blur and keeps the response generic', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    const email = screen.getByLabelText('Email');
    fireEvent.blur(email);
    expect(await screen.findByText('Email is required.')).toBeVisible();

    await user.type(email, 'customer@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    expect(await screen.findByText(/If an account is eligible/)).toBeVisible();
  });

  it('reset-password uses one password field and updates through Supabase', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem('popbox:password-recovery', '1');
    const { container } = render(<ResetPasswordForm />);

    const password = await screen.findByLabelText('New Password');
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(1);
    await user.type(password, 'valid123');
    fireEvent.blur(password);
    await user.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => expect(authMocks.updateUser).toHaveBeenCalledWith({ password: 'valid123' }));
    expect(authMocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(navigationMocks.replace).toHaveBeenCalledWith('/account/sign-in?reset=success');
  });
});
