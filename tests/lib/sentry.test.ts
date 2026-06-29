import type { Event } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';
import { filterAndSanitizeSentryEvent } from '@/lib/sentry';

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
});
