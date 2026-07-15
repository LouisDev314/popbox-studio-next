'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { AuthFormDivider } from '@/components/auth/auth-form-divider';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordRequirements } from '@/components/auth/password-requirements';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { buildMissingGoogleNamePatch, getGoogleProfileName } from '@/lib/auth/google-profile';
import {
  credentialsAuthFormSchema,
  emailAuthFormSchema,
  getCustomerAuthErrorMessage,
  passwordAuthFormSchema,
  SIGN_IN_AVAILABILITY_ERROR_MESSAGE,
  SIGN_IN_CREDENTIAL_ERROR_MESSAGE,
  signInCredentialsAuthFormSchema,
  type CredentialsAuthFormValues,
  type EmailAuthFormValues,
  type PasswordAuthFormValues,
  type SignInCredentialsAuthFormValues,
} from '@/lib/auth/form-validation';
import { validateInternalNext } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/client';
import { getAccountApiErrorCode } from '@/utils/api-errors';

const PENDING_SIGNUP_KEY = 'popbox:pending-signup';
const RESEND_COOLDOWN_KEY = 'popbox:signup-resend-at';
const PASSWORD_RECOVERY_KEY = 'popbox:password-recovery';

function clearPendingConfirmationState() {
  window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  window.localStorage.removeItem(RESEND_COOLDOWN_KEY);
}

interface IPendingSignup {
  email: string;
  next: string;
  createdAt: number;
}

function buildCallbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(validateInternalNext(next))}`;
}

const invalidControlClassName =
  '!border-destructive/80 focus-visible:!border-destructive focus-visible:!ring-destructive/20';

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
  const form = useForm<SignInCredentialsAuthFormValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(signInCredentialsAuthFormSchema),
    shouldFocusError: true,
  });

  const handleSubmit = async (values: SignInCredentialsAuthFormValues) => {
    form.clearErrors('root');
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });

    if (signInError) {
      form.setError('root', { message: getCustomerAuthErrorMessage(signInError, 'signIn') });
      return;
    }

    try {
      await QueryConfigs.fetchAccountProfile();
      router.replace(validateInternalNext(next));
      router.refresh();
    } catch (accountError) {
      const accountErrorCode = getAccountApiErrorCode(accountError);
      if (
        accountErrorCode === 'CUSTOMER_ACCOUNT_REQUIRED'
        || accountErrorCode === 'EMAIL_NOT_VERIFIED'
        || accountErrorCode === 'ACCOUNT_OWNERSHIP_CONFLICT'
      ) {
        await supabase.auth.signOut({ scope: 'local' });
        form.setError('root', { message: SIGN_IN_CREDENTIAL_ERROR_MESSAGE });
        return;
      }

      form.setError('root', { message: SIGN_IN_AVAILABILITY_ERROR_MESSAGE });
    }
  };

  const handleInvalidSubmit = () => {
    form.setError('root', { message: SIGN_IN_CREDENTIAL_ERROR_MESSAGE });
  };

  const handleGoogleError = (message: string) => {
    if (message) {
      form.setError('root', { message });
    } else {
      form.clearErrors('root');
    }
  };

  return (
    <div className="space-y-6">
      {showResetSuccess ? (
        <p role="status" className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
          Your password has been updated. Sign in with your new password.
        </p>
      ) : null}
      <GoogleAuthButton next={next} onError={handleGoogleError} />
      <AuthFormDivider />
      <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={undefined}
                />
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field }) => (
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
                  <Link href={`/account/forgot-password?next=${encodeURIComponent(next)}`} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  {...field}
                  id="sign-in-password"
                  autoComplete="current-password"
                  aria-invalid={undefined}
                />
              </Field>
            )}
          />
        </FieldGroup>
        <FieldError id="sign-in-form-error" errors={[form.formState.errors.root]} />
        <AuthSubmitButton isPending={form.formState.isSubmitting}>Login</AuthSubmitButton>
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
  const form = useForm<CredentialsAuthFormValues>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(credentialsAuthFormSchema),
    shouldFocusError: true,
  });
  const password = useWatch({ control: form.control, name: 'password' }) ?? '';

  const handleSubmit = async (values: CredentialsAuthFormValues) => {
    form.clearErrors('root');
    const safeNext = validateInternalNext(next);
    const { error: signUpError } = await createClient().auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: { emailRedirectTo: buildCallbackUrl(safeNext) },
    });

    if (signUpError) {
      form.setError('root', { message: getCustomerAuthErrorMessage(signUpError, 'signUp') });
      return;
    }

    // The timestamp is captured only after a successful user-triggered submission.
    // eslint-disable-next-line react-hooks/purity
    const pending: IPendingSignup = { email: values.email.trim(), next: safeNext, createdAt: Date.now() };
    window.sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));
    router.push(`/account/check-email?next=${encodeURIComponent(safeNext)}`);
  };

  const handleGoogleError = (message: string) => {
    if (message) {
      form.setError('root', { message });
    } else {
      form.clearErrors('root');
    }
  };

  return (
    <div className="space-y-6">
      <GoogleAuthButton next={next} onError={handleGoogleError} />
      <AuthFormDivider />
      <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="sign-up-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? 'sign-up-email-error' : undefined}
                  className={fieldState.invalid ? invalidControlClassName : undefined}
                  onChange={(event) => {
                    field.onChange(event);
                    if (fieldState.invalid) queueMicrotask(() => void form.trigger('email'));
                  }}
                />
                {fieldState.invalid ? <FieldError id="sign-up-email-error" errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => {
              const describedBy = [
                fieldState.invalid ? 'sign-up-password-error' : null,
                'sign-up-password-requirements',
              ].filter(Boolean).join(' ');

              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
                  <PasswordInput
                    {...field}
                    id="sign-up-password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={describedBy}
                    className={fieldState.invalid ? invalidControlClassName : undefined}
                    onChange={(event) => {
                      field.onChange(event);
                      if (fieldState.invalid) queueMicrotask(() => void form.trigger('password'));
                    }}
                  />
                  {fieldState.invalid ? <FieldError id="sign-up-password-error" errors={[fieldState.error]} /> : null}
                  <PasswordRequirements
                    id="sign-up-password-requirements"
                    password={password}
                  />
                </Field>
              );
            }}
          />
        </FieldGroup>
        <FieldError id="sign-up-form-error" errors={[form.formState.errors.root]} />
        <AuthSubmitButton isPending={form.formState.isSubmitting}>Sign up</AuthSubmitButton>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={`/account/sign-in?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline-offset-4 hover:underline">Log in</Link>
      </p>
    </div>
  );
}

export function CheckEmailState({ next }: { next: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reconciliationRef = useRef<Promise<void> | null>(null);
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
    const reconcileVerifiedCustomer = () => {
      if (reconciliationRef.current) {
        return reconciliationRef.current;
      }

      reconciliationRef.current = (async () => {
        const supabase = createClient();
        const userResult = await supabase.auth.getUser();
        const user = userResult.data.user;

        if (userResult.error || !user?.email_confirmed_at) {
          return;
        }

        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.error || !refreshed.data.session?.user.email_confirmed_at) {
          return;
        }

        try {
          await queryClient.invalidateQueries({ queryKey: ['account'] });
          await QueryConfigs.fetchAccountProfile();
        } catch {
          return;
        }

        clearPendingConfirmationState();
        router.refresh();
        router.replace(validateInternalNext(next));
      })().finally(() => {
        reconciliationRef.current = null;
      });

      return reconciliationRef.current;
    };

    void reconcileVerifiedCustomer();
    const handleFocus = () => void reconcileVerifiedCustomer();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcileVerifiedCustomer();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [next, queryClient, router]);

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
  const [isComplete, setIsComplete] = useState(false);
  const form = useForm<EmailAuthFormValues>({
    defaultValues: { email: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(emailAuthFormSchema),
    shouldFocusError: true,
  });

  const handleSubmit = async (values: EmailAuthFormValues) => {
    await createClient().auth.resetPasswordForEmail(values.email.trim(), {
      redirectTo: buildCallbackUrl('/account/reset-password'),
    });
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <p className="text-sm leading-6 text-muted-foreground">If an account is eligible, a password reset link will arrive shortly.</p>
        <Link
          href="/account/sign-in"
          className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
            <Input
              {...field}
              id="forgot-email"
              type="email"
              autoComplete="email"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? 'forgot-email-error' : undefined}
              className={fieldState.invalid ? invalidControlClassName : undefined}
              onChange={(event) => {
                field.onChange(event);
                if (fieldState.invalid) queueMicrotask(() => void form.trigger('email'));
              }}
            />
            {fieldState.invalid ? <FieldError id="forgot-email-error" errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />
      <AuthSubmitButton isPending={form.formState.isSubmitting}>Send Reset Link</AuthSubmitButton>
      <Link
        href="/account/sign-in"
        className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to Sign In
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const form = useForm<PasswordAuthFormValues>({
    defaultValues: { password: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(passwordAuthFormSchema),
    shouldFocusError: true,
  });
  const password = useWatch({ control: form.control, name: 'password' }) ?? '';

  useEffect(() => {
    void createClient().auth.getSession().then(({ data, error: sessionError }) => {
      const hasRecoveryMarker = window.sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1';
      setHasRecoverySession(Boolean(hasRecoveryMarker && data.session && !sessionError));
      setIsChecking(false);
    });
  }, []);

  const handleSubmit = async (values: PasswordAuthFormValues) => {
    form.clearErrors('root');
    const { error: updateError } = await createClient().auth.updateUser({ password: values.password });
    if (updateError) {
      form.setError('root', { message: getCustomerAuthErrorMessage(updateError, 'passwordUpdate') });
      return;
    }

    await createClient().auth.signOut({ scope: 'local' });
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
    router.replace('/account/sign-in?reset=success');
    router.refresh();
  };

  if (isChecking) {
    return (
      <div
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <Spinner />
        Checking reset link…
      </div>
    );
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
    <form className="space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => {
          const describedBy = [
            fieldState.invalid ? 'reset-password-error' : null,
            'reset-password-requirements',
          ].filter(Boolean).join(' ');

          return (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password">New Password</FieldLabel>
              <PasswordInput
                {...field}
                id="reset-password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={describedBy}
                className={fieldState.invalid ? invalidControlClassName : undefined}
                onChange={(event) => {
                  field.onChange(event);
                  if (fieldState.invalid) queueMicrotask(() => void form.trigger('password'));
                }}
              />
              {fieldState.invalid ? <FieldError id="reset-password-error" errors={[fieldState.error]} /> : null}
              <PasswordRequirements
                id="reset-password-requirements"
                password={password}
              />
            </Field>
          );
        }}
      />
      <FieldError id="reset-password-form-error" errors={[form.formState.errors.root]} />
      <AuthSubmitButton isPending={form.formState.isSubmitting}>Update Password</AuthSubmitButton>
    </form>
  );
}

export function AuthCallbackClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      if (exchange.error || !exchange.data.session || !exchange.data.user) {
        setError('We could not complete sign-in. Please try again.');
        return;
      }

      const refreshed = await supabase.auth.refreshSession(exchange.data.session);
      if (refreshed.error || !refreshed.data.session) {
        setError('We could not complete sign-in. Please try again.');
        return;
      }

      const verifiedUserResult = await supabase.auth.getUser();
      if (verifiedUserResult.error || !verifiedUserResult.data.user) {
        setError('We could not complete sign-in. Please try again.');
        return;
      }

      if (next === '/account/reset-password') {
        window.sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1');
        router.replace(next);
        return;
      }

      try {
        await queryClient.invalidateQueries({ queryKey: ['account'] });
        const profileResponse = await QueryConfigs.fetchAccountProfile();
        const patch = buildMissingGoogleNamePatch(
          profileResponse.data.data,
          getGoogleProfileName(verifiedUserResult.data.user),
        );
        if (Object.keys(patch).length > 0) {
          try {
            await MutationConfigs.patchAccountProfile(patch);
          } catch {
            // A successful login is not blocked by optional profile synchronization.
          }
        }
        clearPendingConfirmationState();
        router.refresh();
        router.replace(next);
      } catch (accountError) {
        if (getAccountApiErrorCode(accountError) === 'CUSTOMER_ACCOUNT_REQUIRED') {
          await supabase.auth.signOut({ scope: 'local' });
          setError('This sign-in is not available for customer accounts.');
          return;
        }
        setError('We could not open your account right now. Please try again.');
      }
    };

    void run();
  }, [queryClient, router]);

  if (error) {
    return (
      <div className="space-y-6 text-center">
        <FieldError>{error}</FieldError>
        <Button asChild size="lg" className="w-full"><Link href="/account/sign-in">Try Again</Link></Button>
        <Link
          href="/account/sign-in"
          className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return <div className="flex flex-col items-center gap-4 text-center" aria-live="polite"><Spinner className="h-8 w-8 text-primary" /><div><p className="font-medium">Signing you in…</p><p className="mt-1 text-sm text-muted-foreground">Please wait a moment.</p></div></div>;
}
