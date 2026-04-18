import * as Sentry from '@sentry/nextjs';
import {
  getServerSentryDsn,
  sanitizeBreadcrumb,
  sanitizeSentryEvent,
  sentryEnabled,
  sentryTracesSampleRate,
} from '@/lib/sentry';

Sentry.init({
  dsn: getServerSentryDsn(),
  enabled: sentryEnabled,
  tracesSampleRate: sentryTracesSampleRate,
  sendDefaultPii: false,
  beforeSend: sanitizeSentryEvent,
  beforeSendTransaction: sanitizeSentryEvent,
  beforeBreadcrumb: sanitizeBreadcrumb,
});
