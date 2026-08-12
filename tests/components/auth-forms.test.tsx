import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthCallbackClient,
  CheckEmailState,
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
} from '@/components/auth/auth-forms';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';

const googleIdentityMocks = vi.hoisted(() => ({
  credentialHandler: null as ((response: { credential?: string }) => void) | null,
  initialize: vi.fn(),
  release: vi.fn(),
  renderButton: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithIdToken: vi.fn(),
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

const queryMocks = vi.hoisted(() => ({
  fetchQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  useQueryClient: () => queryMocks,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => navigationMocks,
}));

vi.mock('@/configs/public-env', () => ({
  default: () => ({ googleClientId: 'google-client-id.apps.googleusercontent.com' }),
}));

vi.mock('@/lib/auth/google-identity', () => ({
  initializeGoogleIdentityServices: googleIdentityMocks.initialize,
  releaseGoogleCredentialHandler: googleIdentityMocks.release,
  renderGoogleIdentityButton: googleIdentityMocks.renderButton,
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
    googleIdentityMocks.credentialHandler = null;
    googleIdentityMocks.initialize.mockReset();
    googleIdentityMocks.release.mockReset();
    googleIdentityMocks.renderButton.mockReset();
    googleIdentityMocks.initialize.mockImplementation(async (_clientId, credentialHandler) => {
      googleIdentityMocks.credentialHandler = credentialHandler;
      return {};
    });
    googleIdentityMocks.renderButton.mockImplementation((_api, parent: HTMLElement) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Continue with Google');
      button.textContent = 'Continue with Google';
      button.addEventListener('click', () => {
        googleIdentityMocks.credentialHandler?.({ credential: 'google-id-token' });
      });
      parent.replaceChildren(button);
    });
    authMocks.signInWithIdToken.mockResolvedValue({
      data: {
        session: {
          access_token: 'google-session',
          user: {
            id: 'customer-user-id',
            identities: [{
              provider: 'google',
              identity_data: { given_name: 'Google', family_name: 'Customer' },
            }],
          },
        },
        user: { id: 'customer-user-id' },
      },
      error: null,
    });
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: 'customer-user-id' } } },
      error: null,
    });
    authMocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: { access_token: 'confirmed', user: { id: 'customer-user-id' } },
        user: { id: 'customer-user-id', email_confirmed_at: '2026-07-15T00:00:00Z' },
      },
      error: null,
    });
    authMocks.refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'confirmed',
          user: { id: 'customer-user-id', email_confirmed_at: '2026-07-15T00:00:00Z' },
        },
      },
      error: null,
    });
    authMocks.getUser.mockResolvedValue({
      data: { user: { email_confirmed_at: '2026-07-15T00:00:00Z' } },
      error: null,
    });
    authMocks.resend.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({ error: null });
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMocks.updateUser.mockResolvedValue({ error: null });
    authMocks.signOut.mockResolvedValue({ error: null });
    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'recovery',
          user: { id: 'customer-user-id', email_confirmed_at: '2026-07-15T00:00:00Z' },
        },
      },
      error: null,
    });
    accountMocks.fetchAccountProfile.mockResolvedValue({
      data: {
        data: {
          account: {
            id: 'customer-id',
            email: 'customer@example.com',
            emailVerified: true,
            createdAt: '2026-07-15T00:00:00Z',
          },
          profile: {
            firstName: null,
            lastName: null,
            phone: null,
            createdAt: '2026-07-15T00:00:00Z',
            updatedAt: '2026-07-15T00:00:00Z',
          },
        },
      },
    });
    queryMocks.fetchQuery.mockReset();
    queryMocks.fetchQuery.mockImplementation(async (options) => options.queryFn({
      signal: new AbortController().signal,
    }));
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('keeps Google before the divider and email fields, with native validation disabled', async () => {
    const { container } = render(<SignInForm next="/account" />);
    const google = await screen.findByRole('button', { name: 'Continue with Google' });
    const divider = screen.getByText('or');
    const email = screen.getByLabelText('Email');

    expect(google.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('form')).toHaveAttribute('novalidate');
    expect(email).not.toHaveAttribute('required');
  });

  it('exchanges the Google credential with Supabase and follows normal post-login behavior', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account/orders" />);

    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    expect(authMocks.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
    });
    await waitFor(() => expect(navigationMocks.replace).toHaveBeenCalledWith('/account/orders'));
    expect(queryMocks.fetchQuery).toHaveBeenCalledTimes(1);
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('renders the same native Google button on account registration', async () => {
    render(<SignUpForm next="/account" />);

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeVisible();
    expect(googleIdentityMocks.initialize).toHaveBeenCalledWith(
      'google-client-id.apps.googleusercontent.com',
      expect.any(Function),
    );
  });

  it('surfaces Supabase Google authentication failures without exposing provider details', async () => {
    const user = userEvent.setup();
    authMocks.signInWithIdToken.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'raw Supabase provider failure' },
    });
    render(<SignInForm next="/account" />);

    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google sign-in is unavailable right now. Please try again.',
    );
    expect(screen.queryByText('raw Supabase provider failure')).not.toBeInTheDocument();
  });

  it('fails safely when the Google client ID is missing', async () => {
    const onError = vi.fn();
    render(<GoogleAuthButton clientId="" next="/account" onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(
      'Google sign-in is not configured. Please use email and password.',
    ));
    expect(googleIdentityMocks.initialize).not.toHaveBeenCalled();
    expect(authMocks.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('does not render duplicate Google buttons during Strict Mode setup', async () => {
    const onError = vi.fn();
    const view = render(
      <StrictMode>
        <GoogleAuthButton
          clientId="google-client-id.apps.googleusercontent.com"
          next="/account"
          onError={onError}
        />
      </StrictMode>,
    );

    await waitFor(() => expect(googleIdentityMocks.renderButton).toHaveBeenCalledTimes(1));
    view.rerender(
      <StrictMode>
        <GoogleAuthButton
          clientId="google-client-id.apps.googleusercontent.com"
          next="/account"
          onError={onError}
        />
      </StrictMode>,
    );
    expect(googleIdentityMocks.renderButton).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate Google credential callbacks while authentication is pending', async () => {
    let finishSignIn: (result: unknown) => void = () => undefined;
    authMocks.signInWithIdToken.mockImplementation(() => new Promise((resolve) => {
      finishSignIn = resolve;
    }));
    render(<SignInForm next="/account" />);
    await screen.findByRole('button', { name: 'Continue with Google' });

    googleIdentityMocks.credentialHandler?.({ credential: 'google-id-token' });
    googleIdentityMocks.credentialHandler?.({ credential: 'duplicate-token' });

    expect(authMocks.signInWithIdToken).toHaveBeenCalledTimes(1);
    finishSignIn({ data: { session: null, user: null }, error: { message: 'stop' } });
    await screen.findByRole('alert');
  });

  it('does not validate email syntax or password requirements on blur or submit', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account" />);
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');

    fireEvent.blur(email);
    await user.type(email, 'not-an-email');
    fireEvent.blur(email);
    await user.type(password, 'x');
    fireEvent.blur(password);

    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Password must/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'not-an-email',
      password: 'x',
    }));
  });

  it('blocks an empty submission with one generic root error', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account" />);
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with email and password without applying signup password rules', async () => {
    const user = userEvent.setup();
    render(<SignInForm next="/account/orders" />);
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');

    await user.type(email, 'customer@example.com');
    await user.type(password, 'x');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'customer@example.com',
      password: 'x',
    }));
    expect(navigationMocks.replace).toHaveBeenCalledWith('/account/orders');
  });

  it.each([
    { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 },
    { code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 },
    { code: 'user_not_found', message: 'User not found', status: 400 },
    { code: 'user_banned', message: 'Account disabled', status: 403 },
    { code: 'provider_mismatch', message: 'Use another provider', status: 400 },
  ])('maps credential rejection $code to the same generic message', async (providerError) => {
    const user = userEvent.setup();
    authMocks.signInWithPassword.mockResolvedValue({ error: providerError });
    render(<SignInForm next="/account" />);

    await user.type(screen.getByLabelText('Email'), 'customer@example.com');
    fireEvent.blur(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Password'), 'valid123');
    fireEvent.blur(screen.getByLabelText('Password'));
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.queryByText(providerError.message)).not.toBeInTheDocument();
  });

  it('uses a separate safe message for a clear service failure', async () => {
    const user = userEvent.setup();
    authMocks.signInWithPassword.mockResolvedValue({
      error: { code: 'unexpected_failure', message: 'sensitive raw Supabase detail', status: 503 },
    });
    render(<SignInForm next="/account" />);
    await user.type(screen.getByLabelText('Email'), 'customer@example.com');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in right now. Please try again.');
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

  it('keeps a genuinely unverified customer on check-email', async () => {
    authMocks.refreshSession.mockResolvedValue({
      data: { session: { user: { id: 'customer-user-id', email_confirmed_at: null } } },
      error: null,
    });
    render(<CheckEmailState next="/account/orders" />);

    expect(await screen.findByText('Open the email to activate your account.')).toBeVisible();
    await waitFor(() => expect(authMocks.getSession).toHaveBeenCalled());
    expect(authMocks.getUser).not.toHaveBeenCalled();
    expect(accountMocks.fetchAccountProfile).not.toHaveBeenCalled();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it('redirects a verified customer away from check-email and clears pending state', async () => {
    window.sessionStorage.setItem('popbox:pending-signup', JSON.stringify({
      email: 'new@example.com', next: '/account/orders', createdAt: Date.now(),
    }));
    window.localStorage.setItem('popbox:signup-resend-at', String(Date.now() + 60_000));
    render(<CheckEmailState next="/account/orders" />);

    await waitFor(() => expect(navigationMocks.replace).toHaveBeenCalledWith('/account/orders'));
    expect(accountMocks.fetchAccountProfile).toHaveBeenCalledTimes(1);
    expect(queryMocks.fetchQuery).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('popbox:pending-signup')).toBeNull();
    expect(window.localStorage.getItem('popbox:signup-resend-at')).toBeNull();
    expect(navigationMocks.refresh).toHaveBeenCalled();
  });

  it('completes a callback before restoring a safe next route', async () => {
    window.history.replaceState({}, '', '/auth/callback?code=confirmation-code&next=%2Faccount%2Forders');
    window.sessionStorage.setItem('popbox:pending-signup', JSON.stringify({
      email: 'new@example.com', next: '/account/orders', createdAt: Date.now(),
    }));
    render(<AuthCallbackClient />);

    await waitFor(() => expect(navigationMocks.replace).toHaveBeenCalledWith('/account/orders'));
    expect(authMocks.getSession).toHaveBeenCalledTimes(1);
    expect(authMocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(authMocks.refreshSession).not.toHaveBeenCalled();
    expect(authMocks.getUser).not.toHaveBeenCalled();
    expect(queryMocks.fetchQuery).toHaveBeenCalledTimes(1);
    expect(accountMocks.fetchAccountProfile).toHaveBeenCalled();
    expect(window.sessionStorage.getItem('popbox:pending-signup')).toBeNull();
    expect(navigationMocks.refresh).not.toHaveBeenCalled();
  });

  it('shows a safe callback error for an invalid or expired code', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    authMocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'raw expired-token detail' },
    });
    window.history.replaceState({}, '', '/auth/callback?code=expired-code');
    render(<AuthCallbackClient />);

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not complete sign-in. Please try again.');
    expect(screen.queryByText('raw expired-token detail')).not.toBeInTheDocument();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
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
