export type TContactInquiryType =
  | 'product-request'
  | 'order-support'
  | 'shipping-support'
  | 'ticket-support'
  | 'general';

export interface IContactRequestBody {
  firstName: string;
  lastName?: string;
  email: string;
  inquiryType: TContactInquiryType;
  orderNumber?: string;
  requestedSeries?: string;
  message: string;
}
