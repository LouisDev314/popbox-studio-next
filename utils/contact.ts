import {
  type IContactRequestBody,
  type TContactInquiryType,
} from '@/interfaces/contact';

interface IContactFormSubmitValues {
  email: string;
  firstName: string;
  inquiryType: TContactInquiryType;
  lastName?: string;
  message: string;
  orderNumber?: string;
  requestedSeries?: string;
}

function trimOptionalString(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

export function normalizeContactRequestBody(
  values: IContactFormSubmitValues,
): IContactRequestBody {
  return {
    firstName: values.firstName.trim(),
    email: values.email.trim(),
    inquiryType: values.inquiryType,
    message: values.message.trim(),
    ...(trimOptionalString(values.lastName)
      ? { lastName: trimOptionalString(values.lastName) }
      : {}),
    ...(trimOptionalString(values.orderNumber)
      ? { orderNumber: trimOptionalString(values.orderNumber) }
      : {}),
    ...(trimOptionalString(values.requestedSeries)
      ? { requestedSeries: trimOptionalString(values.requestedSeries) }
      : {}),
  };
}
