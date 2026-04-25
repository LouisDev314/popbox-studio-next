export interface IStoreBannerItem {
  id: string;
  message: string;
  linkLabel: string | null;
  linkHref: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface IStoreBannerSettings {
  enabled: boolean;
  items: IStoreBannerItem[];
}

export interface IUpdateStoreBannerSettingsPayload {
  enabled: boolean;
  items: Array<{
    id?: string;
    message: string;
    linkLabel?: string | null;
    linkHref?: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
}
