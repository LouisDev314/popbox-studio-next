'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail } from 'lucide-react';
import { AuthFormDivider } from '@/components/auth/auth-form-divider';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { buildMissingGoogleNamePatch, getGoogleProfileName } from '@/lib/auth/google-profile';
import { validateInternalNext } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/client';
import { getAccountApiErrorCode } from '@/utils/api-errors';

const PENDING_SIGNUP_KEY = 'popbox:pending-signup';
const RESEND_COOLDOWN_KEY = 'popbox:signup-resend-at';
const PASSWORD_RECOVERY_KEY = 'popbox:password-recovery';

interface IPendingSignup {
  email: string;
  next: string;
  createdAt: number;
}

function buildCallbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(validateInternalNext(next))}`;
}

function AuthSubmitButton({ children, isPending }: { children: string; isPending: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={isPending}>
      {isPending ? <Spinner className="mr-2" /> : null}
      {children}
    </Button>
  );
}

export function SignInForm({ next, showResetSuccess = false }: { next: string; showResetSuccess?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsPending(true);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });

    if (signInError) {
      setError('Email or password is incorrect.');
      setIsPending(false);
      return;
    }

    try {
      await QueryConfigs.fetchAccountProfile();
      router.replace(validateInternalNext(next));
      router.refresh();
    } catch (accountError) {
      if (getAccountApiErrorCode(accountError) === 'CUSTOMER_ACCOUNT_REQUIRED') {
        router.replace('/admin');
        router.refresh();
        return;
      }

      setError('We could not open your account right now. Please try again.');
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {showResetSuccess ? (
        <p role="status" className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
          Your password has been updated. Sign in with your new password.
        </p>
      ) : null}
      <GoogleAuthButton next={next} onError={setError} />
      <AuthFormDivider />
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
            <Input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
              <Link href={`/account/forgot-password?next=${encodeURIComponent(next)}`} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordInput id="sign-in-password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
        </FieldGroup>
        <FieldError>{error}</FieldError>
        <AuthSubmitButton isPending={isPending}>Sign In</AuthSubmitButton>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to PopBox Studio?{' '}
        <Link href={`/account/sign-up?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmation) {
      setError('Passwords must match.');
      return;
    }

    setIsPending(true);
    const safeNext = validateInternalNext(next);
    const { error: signUpError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: buildCallbackUrl(safeNext) },
    });

    if (signUpError) {
      setError(signUpError.message || 'We could not create your account. Please try again.');
      setIsPending(false);
      return;
    }

    const pending: IPendingSignup = { email: email.trim(), next: safeNext, createdAt: Date.now() };
    window.sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));
    router.push(`/account/check-email?next=${encodeURIComponent(safeNext)}`);
  };

  return (
    <div className="space-y-6">
      <GoogleAuthButton next={next} onError={setError} />
      <AuthFormDivider />
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
            <Input id="sign-up-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
            <PasswordInput id="sign-up-password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="sign-up-confirmation">Confirm Password</FieldLabel>
            <PasswordInput id="sign-up-confirmation" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </Field>
        </FieldGroup>
        <FieldError>{error}</FieldError>
        <AuthSubmitButton isPending={isPending}>Sign up</AuthSubmitButton>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={`/account/sign-in?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline-offset-4 hover:underline">Log in</Link>
      </p>
    </div>
  );
}

export function CheckEmailState({ next }: { next: string }) {
  const [pending, setPending] = useState<IPendingSignup | null>(null);
  const [message, setMessage] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
        if (stored) {
          const value = JSON.parse(stored) as IPendingSignup;
          if (typeof value.email === 'string' && typeof value.createdAt === 'number') {
            setPending(value);
          }
        }
      } catch {
        setPending(null);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const updateCooldown = () => {
      const resendAt = Number(window.localStorage.getItem(RESEND_COOLDOWN_KEY) ?? 0);
      setRemainingSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    };

    updateCooldown();
    const interval = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const handleResend = async () => {
    if (!pending?.email || remainingSeconds > 0) {
      return;
    }

    setIsPending(true);
    setMessage('');
    const safeNext = validateInternalNext(pending.next || next);
    const { error } = await createClient().auth.resend({
      type: 'signup',
      email: pending.email,
      options: { emailRedirectTo: buildCallbackUrl(safeNext) },
    });
    const resendAt = Date.now() + 60_000;
    window.localStorage.setItem(RESEND_COOLDOWN_KEY, String(resendAt));
    setRemainingSeconds(60);
    setMessage(error ? 'Please wait before requesting another email.' : 'A new verification email is on its way.');
    setIsPending(false);
  };

  return (
    <div className="space-y-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary"><Mail className="h-6 w-6" /></span>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">
        <p>We sent a verification link{pending?.email ? <> to <strong className="font-medium text-foreground">{pending.email}</strong></> : ' to your email address'}.</p>
        <p>Open the email to activate your account.</p>
      </div>
      {pending?.email ? (
        <Button type="button" variant="outline" size="lg" className="w-full" disabled={isPending || remainingSeconds > 0} onClick={handleResend}>
          {isPending ? <Spinner className="mr-2" /> : null}
          {remainingSeconds > 0 ? `Resend in ${remainingSeconds}s` : 'Resend Email'}
        </Button>
      ) : null}
      <Button asChild size="lg" className="w-full"><Link href="/">Continue Shopping</Link></Button>
      <Link href={`/account/sign-up?next=${encodeURIComponent(validateInternalNext(pending?.next || next))}`} className="inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Use a different email</Link>
      {message ? <p aria-live="polite" className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: buildCallbackUrl('/account/reset-password'),
    });
    setIsPending(false);
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <p className="text-sm leading-6 text-muted-foreground">If an account is eligible, a password reset link will arrive shortly.</p>
        <Button asChild size="lg" className="w-full"><Link href="/account/sign-in">Back to Sign In</Link></Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
        <Input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <AuthSubmitButton isPending={isPending}>Send Reset Link</AuthSubmitButton>
      <Button asChild variant="ghost" className="w-full"><Link href="/account/sign-in">Back to Sign In</Link></Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void createClient().auth.getSession().then(({ data, error: sessionError }) => {
      const hasRecoveryMarker = window.sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1';
      setHasRecoverySession(Boolean(hasRecoveryMarker && data.session && !sessionError));
      setIsChecking(false);
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Passwords must match.');
      return;
    }

    setIsPending(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || 'This reset link is invalid or expired.');
      setIsPending(false);
      return;
    }

    await createClient().auth.signOut({ scope: 'local' });
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
    router.replace('/account/sign-in?reset=success');
    router.refresh();
  };

  if (isChecking) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Spinner />Checking reset link…</div>;
  }

  if (!hasRecoverySession) {
    return (
      <div className="space-y-6">
        <FieldError>This password reset link is invalid or expired.</FieldError>
        <Button asChild size="lg" className="w-full"><Link href="/account/forgot-password">Request a New Link</Link></Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field><FieldLabel htmlFor="reset-password">New Password</FieldLabel><PasswordInput id="reset-password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Field><FieldLabel htmlFor="reset-confirmation">Confirm Password</FieldLabel><PasswordInput id="reset-confirmation" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
      </FieldGroup>
      <FieldError>{error}</FieldError>
      <AuthSubmitButton isPending={isPending}>Update Password</AuthSubmitButton>
    </form>
  );
}

export function AuthCallbackClient() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const next = validateInternalNext(params.get('next'));
      if (!code) {
        setError('This sign-in link is invalid or expired.');
        return;
      }

      const supabase = createClient();
      const exchange = await supabase.auth.exchangeCodeForSession(code);
      if (exchange.error || !exchange.data.user) {
        setError('We could not complete sign-in. Please try again.');
        return;
      }

      if (next === '/account/reset-password') {
        window.sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1');
        router.replace(next);
        return;
      }

      try {
        const profileResponse = await QueryConfigs.fetchAccountProfile();
        const patch = buildMissingGoogleNamePatch(profileResponse.data.data, getGoogleProfileName(exchange.data.user));
        if (Object.keys(patch).length > 0) {
          try {
            await MutationConfigs.patchAccountProfile(patch);
          } catch {
            // A successful login is not blocked by optional profile synchronization.
          }
        }
        router.replace(next);
        router.refresh();
      } catch (accountError) {
        if (getAccountApiErrorCode(accountError) === 'CUSTOMER_ACCOUNT_REQUIRED') {
          router.replace('/admin');
          router.refresh();
          return;
        }
        setError('We could not open your account right now. Please try again.');
      }
    };

    void run();
  }, [router]);

  if (error) {
    return (
      <div className="space-y-6 text-center">
        <FieldError>{error}</FieldError>
        <Button asChild size="lg" className="w-full"><Link href="/account/sign-in">Try Again</Link></Button>
        <Button asChild variant="ghost" className="w-full"><Link href="/account/sign-in">Back to Sign In</Link></Button>
      </div>
    );
  }

  return <div className="flex flex-col items-center gap-4 text-center" aria-live="polite"><Spinner className="h-8 w-8 text-primary" /><div><p className="font-medium">Signing you in…</p><p className="mt-1 text-sm text-muted-foreground">Please wait a moment.</p></div></div>;
}
