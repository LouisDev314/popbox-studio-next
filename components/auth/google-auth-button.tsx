'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import { validateInternalNext } from '@/lib/auth/redirects';
import { getAccountApiErrorCode } from '@/utils/api-errors';

const GOOGLE_BUTTON_MAX_WIDTH = 400;

interface IGoogleAuthButtonProps {
  clientId?: string;
  next: string;
  onError: (message: string) => void;
}

function getGoogleButtonWidth(container: HTMLElement): number {
  const measuredWidth = Math.floor(container.getBoundingClientRect().width || container.clientWidth);
  return Math.max(1, Math.min(measuredWidth || GOOGLE_BUTTON_MAX_WIDTH, GOOGLE_BUTTON_MAX_WIDTH));
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

  const handleCredential = useCallback(async (response: IGoogleCredentialResponse) => {
    if (isPendingRef.current) {
      return;
    }

    const googleIdToken = response.credential?.trim();
    if (!googleIdToken) {
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
      });
    } catch {
      isPendingRef.current = false;
      setIsPending(false);
      onErrorRef.current('Google sign-in is unavailable right now. Please try again.');
      return;
    }

    const authenticatedUser = signInResult.data.session?.user ?? signInResult.data.user;
    if (signInResult.error || !signInResult.data.session || !authenticatedUser?.id) {
      isPendingRef.current = false;
      setIsPending(false);
      onErrorRef.current('Google sign-in is unavailable right now. Please try again.');
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
        } catch {
          // A successful login is not blocked by optional profile synchronization.
        }
      }

      clearPendingConfirmationState();
      router.replace(validateInternalNext(next));
      router.refresh();
    } catch (accountError) {
      if (getAccountApiErrorCode(accountError) === 'CUSTOMER_ACCOUNT_REQUIRED') {
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
      .catch(() => {
        if (!isActive) {
          return;
        }

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
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm border bg-background text-sm text-muted-foreground" role="status">
          <Spinner className="mr-2" />
          Signing in with Google…
        </div>
      ) : null}
    </div>
  );
}
