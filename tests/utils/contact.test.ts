import { describe, expect, it } from 'vitest';
import { normalizeContactRequestBody } from '@/utils/contact';

describe('normalizeContactRequestBody', () => {
  it('omits empty optional fields before sending the request', () => {
    expect(normalizeContactRequestBody({
      email: ' customer@example.com ',
      firstName: ' Louis ',
      inquiryType: 'general',
      lastName: ' ',
      message: ' Hello from the storefront ',
      orderNumber: '',
      requestedSeries: ' Naruto ',
    })).toEqual({
      email: 'customer@example.com',
      firstName: 'Louis',
      inquiryType: 'general',
      message: 'Hello from the storefront',
      requestedSeries: 'Naruto',
    });
  });
});
