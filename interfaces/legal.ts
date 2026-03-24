export type LegalDocumentType =
  | 'faq'
  | 'shipping_returns'
  | 'terms'
  | 'privacy';

export interface IAdminLegalDocument {
  id: string;
  type: LegalDocumentType;
  title: string;
  content: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPublicLegalDocument extends IAdminLegalDocument {}

export interface IAdminLegalListResponse {
  items: IAdminLegalDocument[];
}

export interface IAdminLegalCreate {
  type: LegalDocumentType;
  content: string;
}

export interface IAdminLegalUpdate {
  content: string;
}
