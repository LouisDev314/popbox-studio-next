# Authentication session policy

Supabase Auth remains the session authority. PopBox Studio does not issue its own tokens or keep a parallel session table.

## Hosted Supabase settings

Configure these values in **Supabase Dashboard → Authentication → Sessions** (Pro plan or higher is required for time-boxed and inactivity controls):

- JWT expiry limit: `3600` seconds (1 hour)
- Inactivity timeout: `2592000` seconds (30 days)
- Time-box user sessions: `7776000` seconds (90 days)
- Single session per user: leave disabled unless the product policy is intentionally changed
- Refresh token reuse interval: keep the Supabase default of 10 seconds

Supabase evaluates the inactivity and time-box rules when a refresh occurs. Their effective upper bound is therefore the configured duration plus up to one JWT lifetime. The browser and Next.js proxy keep Supabase's normal silent refresh enabled, so a routine one-hour JWT expiry does not force a new login.

Supabase defines inactivity as time since the session was last refreshed. PopBox Studio deliberately does not write a separate timestamp on mouse movement or every request. Consequently, an open browser tab that continues Supabase's automatic refresh is considered active even if the person is not interacting with it. Enforcing a stricter "meaningful click/navigation" definition as a security boundary would require trusted activity state in the separate backend; a client-owned timestamp would be bypassable and is not used as authority here.

The application also checks signed `amr[].timestamp` and `iat` claims for customer account access when those claims are available. This is defense in depth; the hosted Supabase settings remain authoritative for the 30-day inactivity and 90-day absolute lifetime rules because they validate the refresh session.

## Admin maximum lifetime

Admin access has a separate 12-hour application limit. The browser uses the signed access token's earliest non-`token_refresh` `amr[].timestamp` only for immediate UX. The Next.js proxy calls `supabase.auth.getClaims()` and rejects protected `/admin` pages and same-origin `/api/v1/admin/**` requests when the verified authentication timestamp is 12 hours old or cannot be established. This proxy check cannot be bypassed by editing browser storage.

The separate backend API must mirror this rule in its existing ES256/JWKS authorization guard. After the normal signature, issuer, audience, expiry, and admin-role checks, it must reject an admin token when either:

1. the earliest non-refresh signed `amr[].timestamp` is at least 43,200 seconds old; or
2. preferably, the signed `session_id` does not identify an `auth.sessions` row whose trusted `created_at` is less than 43,200 seconds old.

The database/session lookup is the stronger option for sensitive operations because it can also prove that the session still exists. This frontend-only repository cannot change that separate backend guard.

## Logout and recovery

Admin logout never calls the backend API. It asks Supabase to sign out the current session with `{ scope: 'local' }`, clears account and admin query caches, and replaces navigation with `/admin/login`. Whether the Supabase request succeeds or fails, the browser then runs `@supabase/ssr`'s supported `clearAuthCookiesAtScopes()` cleanup for the configured project cookie. This removes stale or chunked auth cookies without hard-coding individual opaque cookie names.

An admin API `401` gets one explicit Supabase refresh and one retry. A second `401`, a missing session, an invalid refresh token, or a session-policy failure starts the same logout/recovery path. A `403` is treated as authorization failure: admin cache and UI access are cleared, but the Supabase/customer session is preserved so a valid customer is not logged out merely for lacking admin permission. Network failures and retryable Supabase Auth failures are not converted into sign-out; admin operations fail closed and can be retried.
