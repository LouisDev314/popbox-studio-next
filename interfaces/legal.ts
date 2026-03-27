export type LegalDocumentType =
  | 'shipping_returns'
  | 'terms'
  | 'privacy';

export type AdminLegalType =
  | 'faq'
  | LegalDocumentType;

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

export type IPublicLegalDocument = IAdminLegalDocument;

export interface IPublicFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IFaqListResponse<TItem = IPublicFaqItem> {
  items: TItem[];
}

export interface IAdminLegalListResponse {
  items: IAdminLegalDocument[];
}

export type IAdminFaqItem = IPublicFaqItem;

export type IAdminFaqListResponse = IFaqListResponse<IAdminFaqItem>;

export interface IAdminFaqUpsert {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export type IAdminFaqCreate = IAdminFaqUpsert;

export type IAdminFaqUpdate = Partial<IAdminFaqUpsert>;

export interface IAdminLegalCreate {
  type: LegalDocumentType;
  content: string;
}

export interface IAdminLegalUpdate {
  content: string;
}
