import type { Breadcrumb, Event } from '@sentry/nextjs';

const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_QUERY_KEYS = new Set(['token', 'session_id', 'checkout_session_id']);
const SENSITIVE_HEADER_KEYS = new Set(['authorization', 'cookie', 'set-cookie']);
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

export const sentryEnabled = process.env.NODE_ENV === 'production';
export const sentryTracesSampleRate = sentryEnabled ? 0.1 : 1.0;

export function getClientSentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export function getServerSentryDsn(): string | undefined {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export function sanitizeSentryEvent<T extends Event>(event: T): T {
  let hasChanges = false;
  const nextEvent: T = { ...event };

  if (nextEvent.request) {
    const nextRequest = { ...nextEvent.request };
    const sanitizedUrl = sanitizeUrlValue(nextRequest.url);

    if (sanitizedUrl !== nextRequest.url) {
      nextRequest.url = sanitizedUrl;
      hasChanges = true;
    }

    if (isStringRecord(nextRequest.headers)) {
      const sanitizedHeaders = sanitizeHeaders(nextRequest.headers);

      if (sanitizedHeaders !== nextRequest.headers) {
        nextRequest.headers = sanitizedHeaders;
        hasChanges = true;
      }
    }

    nextEvent.request = nextRequest;
  }

  if (typeof nextEvent.transaction === 'string') {
    const sanitizedTransaction = sanitizeUrlValue(nextEvent.transaction);

    if (sanitizedTransaction !== nextEvent.transaction) {
      nextEvent.transaction = sanitizedTransaction;
      hasChanges = true;
    }
  }

  if (Array.isArray(nextEvent.breadcrumbs)) {
    let breadcrumbsChanged = false;
    const sanitizedBreadcrumbs = nextEvent.breadcrumbs.map((breadcrumb) => {
      const sanitizedBreadcrumb = sanitizeBreadcrumb(breadcrumb);

      if (sanitizedBreadcrumb !== breadcrumb) {
        breadcrumbsChanged = true;
      }

      return sanitizedBreadcrumb;
    });

    if (breadcrumbsChanged) {
      nextEvent.breadcrumbs = sanitizedBreadcrumbs;
      hasChanges = true;
    }
  }

  return hasChanges ? nextEvent : event;
}

export function sanitizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  let hasChanges = false;
  const nextBreadcrumb: Breadcrumb = { ...breadcrumb };

  if (typeof nextBreadcrumb.message === 'string') {
    const sanitizedMessage = sanitizeUrlValue(nextBreadcrumb.message);

    if (sanitizedMessage !== nextBreadcrumb.message) {
      nextBreadcrumb.message = sanitizedMessage;
      hasChanges = true;
    }
  }

  if (isRecord(nextBreadcrumb.data)) {
    const sanitizedData = sanitizeBreadcrumbData(nextBreadcrumb.data);

    if (sanitizedData !== nextBreadcrumb.data) {
      nextBreadcrumb.data = sanitizedData;
      hasChanges = true;
    }
  }

  return hasChanges ? nextBreadcrumb : breadcrumb;
}

function sanitizeBreadcrumbData(data: Record<string, unknown>): Record<string, unknown> {
  let hasChanges = false;
  const nextData: Record<string, unknown> = { ...data };

  for (const key of SENSITIVE_QUERY_KEYS) {
    if (key in nextData && nextData[key] !== REDACTED_VALUE) {
      nextData[key] = REDACTED_VALUE;
      hasChanges = true;
    }
  }

  for (const key of ['url', 'to', 'from']) {
    const value = nextData[key];

    if (typeof value === 'string') {
      const sanitizedValue = sanitizeUrlValue(value);

      if (sanitizedValue !== value) {
        nextData[key] = sanitizedValue;
        hasChanges = true;
      }
    }
  }

  return hasChanges ? nextData : data;
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  let hasChanges = false;
  const nextHeaders: Record<string, string> = { ...headers };

  for (const [key, value] of Object.entries(nextHeaders)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase()) && value !== REDACTED_VALUE) {
      nextHeaders[key] = REDACTED_VALUE;
      hasChanges = true;
    }
  }

  return hasChanges ? nextHeaders : headers;
}

function sanitizeUrlValue(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  try {
    const isAbsoluteUrl = URL_SCHEME_PATTERN.test(value);
    const isProtocolRelativeUrl = value.startsWith('//');
    const url = new URL(value, 'https://sentry.invalid');
    let hasChanges = false;

    for (const key of SENSITIVE_QUERY_KEYS) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, REDACTED_VALUE);
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return value;
    }

    if (isAbsoluteUrl) {
      return url.toString();
    }

    if (isProtocolRelativeUrl) {
      return `//${url.host}${url.pathname}${url.search}${url.hash}`;
    }

    if (value.startsWith('?')) {
      return `${url.search}${url.hash}`;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}
