'use client';

export const PENDING_SIGNUP_KEY = 'popbox:pending-signup';
export const RESEND_COOLDOWN_KEY = 'popbox:signup-resend-at';

export function clearPendingConfirmationState(): void {
  window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  window.localStorage.removeItem(RESEND_COOLDOWN_KEY);
}
