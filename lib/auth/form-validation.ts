import { z } from 'zod';

export const SIGN_IN_CREDENTIAL_ERROR_MESSAGE = 'Incorrect email or password.';
export const SIGN_IN_AVAILABILITY_ERROR_MESSAGE = 'Unable to sign in right now. Please try again.';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .email('Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(1, 'Password is required.')
  .min(8, 'Password must be at least 8 characters.')
  .refine((password) => /[A-Za-z]/.test(password), 'Password must contain a letter.')
  .refine((password) => /\d/.test(password), 'Password must contain a number.');

export const emailAuthFormSchema = z.object({
  email: emailSchema,
});

export const passwordAuthFormSchema = z.object({
  password: passwordSchema,
});

export const credentialsAuthFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signInCredentialsAuthFormSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export type EmailAuthFormValues = z.infer<typeof emailAuthFormSchema>;
export type PasswordAuthFormValues = z.infer<typeof passwordAuthFormSchema>;
export type CredentialsAuthFormValues = z.infer<typeof credentialsAuthFormSchema>;
export type SignInCredentialsAuthFormValues = z.infer<typeof signInCredentialsAuthFormSchema>;

export interface IPasswordRequirements {
  hasLetter: boolean;
  hasMinimumLength: boolean;
  hasNumber: boolean;
}

export function getPasswordRequirements(password: string): IPasswordRequirements {
  return {
    hasLetter: /[A-Za-z]/.test(password),
    hasMinimumLength: password.length >= 8,
    hasNumber: /\d/.test(password),
  };
}

type AuthErrorContext = 'signIn' | 'signUp' | 'passwordUpdate';

interface IAuthErrorShape {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

function getAuthErrorDetails(error: unknown) {
  const value = error && typeof error === 'object' ? error as IAuthErrorShape : {};
  return {
    code: typeof value.code === 'string' ? value.code.toLowerCase() : '',
    message: typeof value.message === 'string' ? value.message.toLowerCase() : '',
    status: typeof value.status === 'number' ? value.status : null,
  };
}

// eslint-disable-next-line complexity -- Auth errors are normalized in one boundary so provider-specific details never leak into the UI.
export function getCustomerAuthErrorMessage(error: unknown, context: AuthErrorContext): string {
  const { code, message, status } = getAuthErrorDetails(error);

  if (context === 'signIn') {
    const name = error && typeof error === 'object' && 'name' in error
      && typeof error.name === 'string'
      ? error.name.toLowerCase()
      : '';
    const isOperationalFailure = Boolean(
      (status !== null && status >= 500)
      || name === 'authretryablefetcherror'
      || code.includes('request_timeout')
      || code.includes('network_error')
      || message.includes('failed to fetch')
      || message.includes('network request failed'),
    );

    return isOperationalFailure
      ? SIGN_IN_AVAILABILITY_ERROR_MESSAGE
      : SIGN_IN_CREDENTIAL_ERROR_MESSAGE;
  }

  if (status === 429 || code.includes('rate_limit') || message.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }

  if (
    code === 'user_already_exists'
    || code === 'identity_already_exists'
    || message.includes('already registered')
    || message.includes('already exists')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (code === 'weak_password' || message.includes('weak password')) {
    return 'Choose a password that meets all listed requirements.';
  }

  if (context === 'signUp') {
    return 'We could not create your account right now. Please try again.';
  }

  return 'We could not update your password. Request a new reset link and try again.';
}
