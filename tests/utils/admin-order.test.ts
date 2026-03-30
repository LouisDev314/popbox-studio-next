import { describe, expect, it } from 'vitest';
import { buildShipmentUpdatePayload, normalizeTrackingUrl } from '@/utils/admin-order';

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

  it('normalizes valid http and https tracking urls', () => {
    expect(normalizeTrackingUrl(' https://track.example.com/TRACK-123 ')).toBe(
      'https://track.example.com/TRACK-123',
    );
    expect(normalizeTrackingUrl('http://track.example.com/TRACK-123')).toBe(
      'http://track.example.com/TRACK-123',
    );
  });

  it('drops invalid tracking urls from the shipment payload', () => {
    expect(normalizeTrackingUrl('javascript:alert(1)')).toBeNull();

    expect(buildShipmentUpdatePayload({
      carrierName: '',
      trackingNumber: '',
      trackingUrl: 'ftp://track.example.com/TRACK-123',
    }, null)).toEqual({});
  });
});
