import * as Sentry from '@sentry/nextjs';
import {
  filterAndSanitizeSentryEvent,
  getClientSentryDsn,
  sanitizeBreadcrumb,
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
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
