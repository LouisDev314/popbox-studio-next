import { describe, expect, it } from 'vitest';
import { buildShipmentUpdatePayload } from '@/utils/admin-order';

describe('buildShipmentUpdatePayload', () => {
  it('returns an empty payload when there are no shipment changes', () => {
    expect(buildShipmentUpdatePayload({
      carrierName: 'Canada Post',
      trackingNumber: 'TRACK-123',
      trackingUrl: 'https://track.example.com/TRACK-123',
    }, {
      carrierName: 'Canada Post',
      trackingNumber: 'TRACK-123',
      trackingUrl: 'https://track.example.com/TRACK-123',
      shippedAt: null,
      deliveredAt: null,
    })).toEqual({});
  });
});
