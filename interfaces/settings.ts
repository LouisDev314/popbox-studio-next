export interface IStoreBannerSettings {
  enabled: boolean;
  message: string;
  linkLabel: string | null;
  linkHref: string | null;
}

export interface IUpdateStoreBannerSettingsPayload {
  enabled: boolean;
  message: string;
  linkLabel?: string | null;
  linkHref?: string | null;
}
