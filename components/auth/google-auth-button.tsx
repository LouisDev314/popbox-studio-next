'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import MutationConfigs from '@/configs/api/mutation-config';
import getPublicEnvConfig from '@/configs/public-env';
import { getAccountProfileQueryOptions } from '@/lib/auth/account-profile-query';
import { buildMissingGoogleNamePatch, getGoogleProfileName } from '@/lib/auth/google-profile';
import {
  initializeGoogleIdentityServices,
  releaseGoogleCredentialHandler,
  renderGoogleIdentityButton,
  type IGoogleCredentialResponse,
  type IGoogleIdentityApi,
} from '@/lib/auth/google-identity';
import { clearPendingConfirmationState } from '@/lib/auth/pending-confirmation';
import { validateInternalNext } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/client';
import { getAccountApiErrorCode } from '@/utils/api-errors';

const GOOGLE_BUTTON_MAX_WIDTH = 400;
const GOOGLE_AUTH_ERROR_MESSAGE = 'Google sign-in is unavailable right now. Please try again.';

interface IGoogleAuthButtonProps {
  clientId?: string;
  next: string;
  onError: (message: string) => void;
}

function getGoogleButtonWidth(container: HTMLElement): number {
  const measuredWidth = Math.floor(container.getBoundingClientRect().width || container.clientWidth);
  return Math.max(1, Math.min(measuredWidth || GOOGLE_BUTTON_MAX_WIDTH, GOOGLE_BUTTON_MAX_WIDTH));
}

function captureGoogleAuthFailure(stage: string, error: unknown): void {
  const authError = error as { code?: unknown; status?: unknown } | null;
  Sentry.captureException(error instanceof Error ? error : new Error('Google authentication failed.'), {
    tags: {
      auth_provider: 'google',
      auth_stage: stage,
    },
    extra: {
      authErrorCode: typeof authError?.code === 'string' ? authError.code : undefined,
      authErrorStatus: typeof authError?.status === 'number' ? authError.status : undefined,
    },
  });
}

export function GoogleAuthButton({
  clientId = getPublicEnvConfig().googleClientId,
  next,
  onError,
}: IGoogleAuthButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const isPendingRef = useRef(false);
  const onErrorRef = useRef(onError);
  const [isPending, setIsPending] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(true);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleCredential = useCallback(async (
    response: IGoogleCredentialResponse,
    nonce: string,
  ) => {
    if (isPendingRef.current) {
      return;
    }

    const googleIdToken = response.credential?.trim();
    if (!googleIdToken) {
      captureGoogleAuthFailure('credential', new Error('Google returned an empty credential.'));
      onErrorRef.current('Google sign-in did not return a credential. Please try again.');
      return;
    }

    isPendingRef.current = true;
    setIsPending(true);
    onErrorRef.current('');

    const supabase = createClient();
    let signInResult;

    try {
      signInResult = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleIdToken,
        nonce,
      });
    } catch (error) {
      captureGoogleAuthFailure('id_token_exchange', error);
      isPendingRef.current = false;
      setIsPending(false);
      onErrorRef.current(GOOGLE_AUTH_ERROR_MESSAGE);
      return;
    }

    const authenticatedUser = signInResult.data.session?.user ?? signInResult.data.user;
    if (signInResult.error || !signInResult.data.session || !authenticatedUser?.id) {
      captureGoogleAuthFailure(
        'id_token_exchange',
        signInResult.error ?? new Error('Supabase did not create a Google session.'),
      );
      isPendingRef.current = false;
      setIsPending(false);
      onErrorRef.current(GOOGLE_AUTH_ERROR_MESSAGE);
      return;
    }

    try {
      const profileResponse = await queryClient.fetchQuery(
        getAccountProfileQueryOptions(authenticatedUser.id),
      );
      const patch = buildMissingGoogleNamePatch(
        profileResponse.data.data,
        getGoogleProfileName(authenticatedUser),
      );
      if (Object.keys(patch).length > 0) {
        try {
          await MutationConfigs.patchAccountProfile(patch);
        } catch (error) {
          captureGoogleAuthFailure('profile_metadata_sync', error);
          // Optional metadata synchronization must not block a successful login.
        }
      }

      clearPendingConfirmationState();
      router.replace(validateInternalNext(next));
      router.refresh();
    } catch (accountError) {
      captureGoogleAuthFailure('account_profile', accountError);
      const accountErrorCode = getAccountApiErrorCode(accountError);
      if (
        accountErrorCode === 'CUSTOMER_ACCOUNT_REQUIRED'
        || accountErrorCode === 'EMAIL_NOT_VERIFIED'
        || accountErrorCode === 'ACCOUNT_OWNERSHIP_CONFLICT'
      ) {
        await supabase.auth.signOut({ scope: 'local' });
        onErrorRef.current('This sign-in is not available for customer accounts.');
      } else {
        onErrorRef.current('We could not open your account right now. Please try again.');
      }

      isPendingRef.current = false;
      setIsPending(false);
    }
  }, [next, queryClient, router]);

  useEffect(() => {
    const normalizedClientId = clientId.trim();
    if (!normalizedClientId) {
      setIsLoadingScript(false);
      onErrorRef.current('Google sign-in is not configured. Please use email and password.');
      return;
    }

    let isActive = true;
    let resizeObserver: ResizeObserver | null = null;
    let renderedWidth = 0;

    const renderButton = (api: IGoogleIdentityApi) => {
      const container = buttonContainerRef.current;
      if (!container) {
        return;
      }

      const width = getGoogleButtonWidth(container);
      if (width === renderedWidth) {
        return;
      }

      renderGoogleIdentityButton(api, container, width);
      renderedWidth = width;
    };

    void initializeGoogleIdentityServices(normalizedClientId, handleCredential)
      .then((api) => {
        if (!isActive) {
          return;
        }

        setIsLoadingScript(false);
        renderButton(api);

        if (typeof ResizeObserver !== 'undefined' && buttonContainerRef.current) {
          resizeObserver = new ResizeObserver(() => renderButton(api));
          resizeObserver.observe(buttonContainerRef.current);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        captureGoogleAuthFailure('gis_script', error);
        setIsLoadingScript(false);
        onErrorRef.current('Google sign-in could not load. Please use email and password or try again.');
      });

    return () => {
      isActive = false;
      resizeObserver?.disconnect();
      releaseGoogleCredentialHandler(handleCredential);
    };
  }, [clientId, handleCredential]);

  return (
    <div className="relative flex min-h-11 w-full items-center justify-center">
      <div ref={buttonContainerRef} className="flex w-full justify-center" />
      {isLoadingScript ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground" role="status">
          <Spinner className="mr-2" />
          Loading Google sign-in…
        </div>
      ) : null}
      {isPending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-full border bg-background text-sm text-muted-foreground" role="status">
          <Spinner className="mr-2" />
          Signing in with Google…
        </div>
      ) : null}
    </div>
  );
}
