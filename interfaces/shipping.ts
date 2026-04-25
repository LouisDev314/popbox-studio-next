export interface IShippingSettings {
  flatShippingCents: number;
  freeShippingThresholdCents: number;
  currency: 'CAD';
}

export interface IUpdateShippingSettingsPayload {
  flatShippingCents: number;
  freeShippingThresholdCents: number;
  currency: 'CAD';
}
