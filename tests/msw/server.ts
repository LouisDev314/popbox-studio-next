import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.get('/api/v1/settings/shipping', () => HttpResponse.json({
    code: 200,
    data: {
      flatShippingCents: 1599,
      calgaryFreeShippingThresholdCents: 7700,
      albertaFreeShippingThresholdCents: 8800,
      freeShippingThresholdCents: 14900,
      currency: 'CAD',
    },
    message: 'Shipping settings loaded',
    status: 'success',
    success: true,
  })),
);
