import * as Sentry from '@sentry/nextjs';
import {
  filterAndSanitizeSentryEvent,
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
  beforeSend: filterAndSanitizeSentryEvent,
  beforeSendTransaction: sanitizeSentryEvent,
  beforeBreadcrumb: sanitizeBreadcrumb,
});
