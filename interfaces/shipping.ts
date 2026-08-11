export type ShippingRegion = 'calgary' | 'alberta' | 'canada';

export interface IShippingSettings {
  flatShippingCents: number;
  calgaryFreeShippingThresholdCents: number;
  albertaFreeShippingThresholdCents: number;
  freeShippingThresholdCents: number;
  currency: 'CAD';
}

export type IUpdateShippingSettingsPayload = IShippingSettings;

export interface IFreeShippingProgress {
  thresholdCents: number;
  remainingCents: number;
  qualified: boolean;
  region: ShippingRegion;
}
