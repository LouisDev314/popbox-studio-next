import type { Event } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';
import { filterAndSanitizeSentryEvent, sanitizeSentryEvent } from '@/lib/sentry';

const ignoredMessage = 'Non-Error promise rejection captured with value: Object Not Found Matching Id:5, MethodName:update, ParamCount:4';

describe('filterAndSanitizeSentryEvent', () => {
  it('drops the known browser extension object update rejection noise event', () => {
    const event: Event = {
      exception: {
        values: [{ value: ignoredMessage }],
      },
    };

    expect(filterAndSanitizeSentryEvent(event)).toBeNull();
  });

  it('drops the same browser extension rejection when the object id changes', () => {
    const event: Event = {
      exception: {
        values: [{
          value: 'Non-Error promise rejection captured with value: Object Not Found Matching Id:11, MethodName:update, ParamCount:4',
        }],
      },
    };

    expect(filterAndSanitizeSentryEvent(event)).toBeNull();
  });

  it('drops the same browser extension rejection from the event message', () => {
    const event: Event = {
      message: 'Non-Error promise rejection captured with value: Object Not Found Matching Id:9, MethodName:update, ParamCount:4',
    };

    expect(filterAndSanitizeSentryEvent(event)).toBeNull();
  });

  it('does not drop other promise rejection events', () => {
    const event: Event = {
      exception: {
        values: [{
          value: 'Non-Error promise rejection captured with value: Object Not Found Matching Id:6, MethodName:checkout, ParamCount:4',
        }],
      },
    };

    expect(filterAndSanitizeSentryEvent(event)).toBe(event);
  });

  it('does not drop unrelated application errors', () => {
    const event: Event = {
      exception: {
        values: [{ value: 'Checkout failed' }],
      },
    };

    expect(filterAndSanitizeSentryEvent(event)).toBe(event);
  });

  it('records a failed link resource without queries, credentials, or fragments', () => {
    const link = document.createElement('link');
    link.href = 'https://user:password@example.com/_next/static/chunks/styles.css?token=private&customer=123#secret';
    link.rel = 'stylesheet';
    link.as = 'style';
    const originalException = new window.Event('error');
    link.dispatchEvent(originalException);
    const event: Event = {
      release: 'deployment-sha',
      contexts: { existing: { value: 'preserved' } },
      exception: { values: [{ type: 'Event', value: 'Event `Event` (type=error) captured as promise rejection' }] },
    };

    const captured = filterAndSanitizeSentryEvent(event, { originalException });

    expect(captured?.contexts).toEqual({
      existing: { value: 'preserved' },
      failed_link_resource: {
        url: 'https://example.com/_next/static/chunks/styles.css',
        rel: 'stylesheet',
        as: 'style',
        online: true,
      },
    });
    expect(captured?.release).toBe('deployment-sha');
    expect(captured?.exception).toEqual(event.exception);
    expect(event.contexts).toEqual({ existing: { value: 'preserved' } });
  });

  it('keeps generic rejections and JSON-LD errors without inventing resource context', () => {
    for (const value of [
      'Event `Event` (type=error) captured as promise rejection',
      'undefined is not an object (evaluating \'r["@context"].toLowerCase\')',
    ]) {
      const event: Event = { exception: { values: [{ value }] } };

      expect(filterAndSanitizeSentryEvent(event, { originalException: new window.Event('error') })).toBe(event);
    }
  });

  it('does not enrich unrelated, empty, or non-HTTP resource events', () => {
    const event: Event = { message: 'Resource failed' };

    for (const href of ['', 'data:text/css,body{}', 'javascript:void(0)']) {
      const link = document.createElement('link');
      link.setAttribute('href', href);
      const originalException = new window.Event('error');
      link.dispatchEvent(originalException);

      expect(filterAndSanitizeSentryEvent(event, { originalException })).toBe(event);
    }

    const image = document.createElement('img');
    const imageError = new window.Event('error');
    image.dispatchEvent(imageError);
    expect(filterAndSanitizeSentryEvent(event, { originalException: imageError })).toBe(event);
  });

  it('drops checkout bodies and strips Google resource query strings', () => {
    const sensitive = '123 Synthetic Avenue';
    const sample = sanitizeSentryEvent({
      request: { url: 'https://api.example.com/api/v1/checkout/quote', data: { shippingAddress: sensitive, addressProof: 'sensitive-proof' } },
      breadcrumbs: [{ data: { url: `https://maps.googleapis.com/maps/api/js?key=secret&input=${encodeURIComponent(sensitive)}` } }],
    });
    expect(sample.request).not.toHaveProperty('data');
    expect(sample.breadcrumbs?.[0]?.data?.url).toBe('https://maps.googleapis.com/maps/api/js');
  });

});
