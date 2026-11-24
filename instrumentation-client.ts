import * as Sentry from '@sentry/nextjs';
import {
  filterAndSanitizeSentryEvent,
  getClientSentryDsn,
  sanitizeBreadcrumb,
  sanitizeGoogleSpan,
  sanitizeSentryEvent,
  sentryEnabled,
  sentryTracesSampleRate,
} from '@/lib/sentry';

Sentry.init({
  dsn: getClientSentryDsn(),
  enabled: sentryEnabled,
  tracesSampleRate: sentryTracesSampleRate,
  sendDefaultPii: false,
  beforeSend: filterAndSanitizeSentryEvent,
  beforeSendTransaction: sanitizeSentryEvent,
  beforeBreadcrumb: sanitizeBreadcrumb,
  beforeSendSpan: sanitizeGoogleSpan,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
