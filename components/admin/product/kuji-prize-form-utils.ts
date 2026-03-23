import { IKujiPrize } from '@/interfaces/product';

export type EditableKujiPrizeField = keyof Pick<
  IKujiPrize,
  'prizeCode' | 'name' | 'description' | 'imageUrl' | 'initialQuantity' | 'remainingQuantity' | 'sortOrder'
>;

export type KujiPrizeFormData = {
  prizeCode: string;
  name: string;
  description: string;
  imageUrl: string;
  initialQuantity: string;
  remainingQuantity: string;
  sortOrder: string;
};

export type KujiPrizeFieldErrors = Partial<Record<EditableKujiPrizeField | 'form', string>>;

export type NormalizedKujiPrizeFormData = {
  prizeCode: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  initialQuantity: number | null;
  remainingQuantity: number | null;
  sortOrder: number | null;
};

type ValidateKujiPrizeFormDataOptions = {
  skipImageUrlValidation?: boolean;
};

type ComparableKujiPrize = Omit<NormalizedKujiPrizeFormData, 'initialQuantity' | 'remainingQuantity' | 'sortOrder'> & {
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
};

export function createKujiPrizeFormData(
  prize: Partial<Pick<IKujiPrize, EditableKujiPrizeField>> = {},
): KujiPrizeFormData {
  return {
    prizeCode: prize.prizeCode ?? '',
    name: prize.name ?? '',
    description: prize.description ?? '',
    imageUrl: prize.imageUrl ?? '',
    initialQuantity: prize.initialQuantity !== undefined ? String(prize.initialQuantity) : '',
    remainingQuantity: prize.remainingQuantity !== undefined ? String(prize.remainingQuantity) : '',
    sortOrder: prize.sortOrder !== undefined ? String(prize.sortOrder) : '',
  };
}

export function normalizeRequiredText(value: string): string {
  return value.trim();
}

export function normalizeOptionalText(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue === '' ? null : trimmedValue;
}

export function parseNonNegativeInteger(value: string): number | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '' || !/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function normalizeKujiPrizeFormData(formData: KujiPrizeFormData): NormalizedKujiPrizeFormData {
  return {
    prizeCode: normalizeRequiredText(formData.prizeCode),
    name: normalizeRequiredText(formData.name),
    description: normalizeOptionalText(formData.description),
    imageUrl: normalizeOptionalText(formData.imageUrl),
    initialQuantity: parseNonNegativeInteger(formData.initialQuantity),
    remainingQuantity: parseNonNegativeInteger(formData.remainingQuantity),
    sortOrder: parseNonNegativeInteger(formData.sortOrder),
  };
}

function normalizePrizeForComparison(prize: IKujiPrize): ComparableKujiPrize {
  return {
    prizeCode: normalizeRequiredText(prize.prizeCode),
    name: normalizeRequiredText(prize.name),
    description: normalizeOptionalText(prize.description ?? ''),
    imageUrl: normalizeOptionalText(prize.imageUrl ?? ''),
    initialQuantity: prize.initialQuantity,
    remainingQuantity: prize.remainingQuantity,
    sortOrder: prize.sortOrder,
  };
}

export function validateKujiPrizeFormData(
  formData: NormalizedKujiPrizeFormData,
  options: ValidateKujiPrizeFormDataOptions = {},
): KujiPrizeFieldErrors {
  const errors: KujiPrizeFieldErrors = {};

  if (formData.prizeCode === '') {
    errors.prizeCode = 'Prize code is required.';
  }

  if (formData.name === '') {
    errors.name = 'Prize name is required.';
  }

  if (!options.skipImageUrlValidation && formData.imageUrl && !isValidUrl(formData.imageUrl)) {
    errors.imageUrl = 'Enter a valid URL.';
  }

  if (formData.initialQuantity === null) {
    errors.initialQuantity = 'Initial quantity is required.';
  }

  if (formData.remainingQuantity === null) {
    errors.remainingQuantity = 'Remaining quantity is required.';
  }

  if (formData.sortOrder === null) {
    errors.sortOrder = 'Sort order is required.';
  }

  if (
    formData.initialQuantity !== null &&
    formData.remainingQuantity !== null &&
    formData.remainingQuantity > formData.initialQuantity
  ) {
    errors.remainingQuantity = 'Remaining quantity cannot exceed initial quantity.';
  }

  return errors;
}

export function buildKujiPrizeCreatePayload(
  formData: NormalizedKujiPrizeFormData,
): Pick<IKujiPrize, EditableKujiPrizeField> {
  if (
    formData.initialQuantity === null ||
    formData.remainingQuantity === null ||
    formData.sortOrder === null
  ) {
    throw new Error('Kuji prize payload requires numeric quantity and sort order values.');
  }

  return {
    prizeCode: formData.prizeCode,
    name: formData.name,
    description: formData.description,
    imageUrl: formData.imageUrl,
    initialQuantity: formData.initialQuantity,
    remainingQuantity: formData.remainingQuantity,
    sortOrder: formData.sortOrder,
  };
}

export function buildKujiPrizeUpdatePayload(
  prize: IKujiPrize,
  formData: NormalizedKujiPrizeFormData,
): Partial<Pick<IKujiPrize, EditableKujiPrizeField>> {
  const originalPrize = normalizePrizeForComparison(prize);
  const payload: Partial<Pick<IKujiPrize, EditableKujiPrizeField>> = {};

  if (formData.prizeCode !== originalPrize.prizeCode) {
    payload.prizeCode = formData.prizeCode;
  }

  if (formData.name !== originalPrize.name) {
    payload.name = formData.name;
  }

  if (formData.description !== originalPrize.description) {
    payload.description = formData.description;
  }

  if (formData.imageUrl !== originalPrize.imageUrl) {
    payload.imageUrl = formData.imageUrl;
  }

  if (formData.initialQuantity !== null && formData.initialQuantity !== originalPrize.initialQuantity) {
    payload.initialQuantity = formData.initialQuantity;
  }

  if (formData.remainingQuantity !== null && formData.remainingQuantity !== originalPrize.remainingQuantity) {
    payload.remainingQuantity = formData.remainingQuantity;
  }

  if (formData.sortOrder !== null && formData.sortOrder !== originalPrize.sortOrder) {
    payload.sortOrder = formData.sortOrder;
  }

  return payload;
}

export function mapKujiPrizeServerValidationErrors(message: string): KujiPrizeFieldErrors {
  const normalizedMessage = message.toLowerCase();
  const errors: KujiPrizeFieldErrors = {};

  if (normalizedMessage.includes('prize code') || normalizedMessage.includes('prizecode')) {
    errors.prizeCode = message;
  }

  if (normalizedMessage.includes('image url') || normalizedMessage.includes('imageurl')) {
    errors.imageUrl = message;
  }

  if (normalizedMessage.includes('initial quantity') || normalizedMessage.includes('initialquantity')) {
    errors.initialQuantity = message;
  }

  if (normalizedMessage.includes('remaining quantity') || normalizedMessage.includes('remainingquantity')) {
    errors.remainingQuantity = message;
  }

  if (normalizedMessage.includes('sort order') || normalizedMessage.includes('sortorder')) {
    errors.sortOrder = message;
  }

  if (normalizedMessage.includes('description')) {
    errors.description = message;
  }

  if (normalizedMessage.includes('name')) {
    errors.name = message;
  }

  if (Object.keys(errors).length === 0) {
    errors.form = message;
  }

  return errors;
}
