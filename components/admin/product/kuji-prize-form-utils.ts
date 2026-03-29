import { type IApiValidationErrors } from '@/interfaces/api-response';
import {
  type IAdminKujiPrizeCreateRequest,
  type IAdminKujiPrizeUpdateRequest,
  IKujiPrize,
} from '@/interfaces/product';
import { type KujiPrizeCode, parseKujiPrizeCode } from '@/lib/kuji-prize-codes';

export type EditableKujiPrizeField = keyof Pick<
  IKujiPrize,
  'prizeCode' | 'name' | 'description' | 'imageUrl' | 'initialQuantity' | 'remainingQuantity' | 'sortOrder'
>;

export type EditableKujiPrizeTextField = Exclude<EditableKujiPrizeField, 'prizeCode'>;

export type KujiPrizeFormData = {
  prizeCode: KujiPrizeCode | '';
  invalidPrizeCode: string | null;
  name: string;
  description: string;
  imageUrl: string;
  initialQuantity: string;
  remainingQuantity: string;
  sortOrder: string;
};

export type KujiPrizeFieldErrors = Partial<Record<EditableKujiPrizeField | 'form', string>>;

export type NormalizedKujiPrizeFormData = {
  prizeCode: KujiPrizeCode | null;
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

type ComparableKujiPrize = Omit<NormalizedKujiPrizeFormData, 'prizeCode' | 'initialQuantity' | 'remainingQuantity' | 'sortOrder'> & {
  prizeCode: string;
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
};

function createPrizeCodeState(prizeCode: string | undefined): Pick<KujiPrizeFormData, 'prizeCode' | 'invalidPrizeCode'> {
  const normalizedPrizeCode = normalizeRequiredText(prizeCode ?? '');
  const parsedPrizeCode = parseKujiPrizeCode(normalizedPrizeCode);

  if (parsedPrizeCode) {
    return {
      prizeCode: parsedPrizeCode,
      invalidPrizeCode: null,
    };
  }

  return {
    prizeCode: '',
    invalidPrizeCode: normalizedPrizeCode === '' ? null : normalizedPrizeCode,
  };
}

export function createKujiPrizeFormData(
  prize: Partial<Pick<IKujiPrize, EditableKujiPrizeField>> = {},
): KujiPrizeFormData {
  return {
    ...createPrizeCodeState(prize.prizeCode),
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
    prizeCode: formData.prizeCode === '' ? null : formData.prizeCode,
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
    prizeCode: parseKujiPrizeCode(prize.prizeCode) ?? normalizeRequiredText(prize.prizeCode),
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

  if (formData.prizeCode === null) {
    errors.prizeCode = 'Rank is required.';
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
): IAdminKujiPrizeCreateRequest {
  if (
    formData.prizeCode === null ||
    formData.initialQuantity === null ||
    formData.remainingQuantity === null ||
    formData.sortOrder === null
  ) {
    throw new Error('Kuji prize payload requires a valid rank, numeric quantity, and sort order values.');
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
): IAdminKujiPrizeUpdateRequest {
  const originalPrize = normalizePrizeForComparison(prize);
  const payload: IAdminKujiPrizeUpdateRequest = {};

  if (formData.prizeCode !== null && formData.prizeCode !== originalPrize.prizeCode) {
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

function collectValidationEntries(
  value: IApiValidationErrors,
  path = '',
): Array<{ message: string; path: string }> {
  if (typeof value === 'string') {
    return [{ message: value, path }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => (
      collectValidationEntries(entry, path ? `${path}[${index}]` : `[${index}]`)
    ));
  }

  return Object.entries(value).flatMap(([key, entry]) => (
    collectValidationEntries(entry, path ? `${path}.${key}` : key)
  ));
}

export function mapKujiPrizeServerValidationErrors(
  value: IApiValidationErrors | string | undefined,
): KujiPrizeFieldErrors {
  const entries = typeof value === 'string'
    ? [{ message: value, path: '' }]
    : value
      ? collectValidationEntries(value)
      : [];
  const errors: KujiPrizeFieldErrors = {};
  const fieldMatchers: Array<{
    field: keyof KujiPrizeFieldErrors;
    match: (path: string, message: string) => boolean;
  }> = [
    {
      field: 'prizeCode',
      match: (path, message) => (
        path.includes('prizecode')
        || path.includes('prize_code')
        || message.includes('prize code')
        || message.includes('prizecode')
      ),
    },
    {
      field: 'imageUrl',
      match: (path, message) => (
        path.includes('imageurl')
        || path.includes('image_url')
        || message.includes('image url')
        || message.includes('imageurl')
      ),
    },
    {
      field: 'initialQuantity',
      match: (path, message) => (
        path.includes('initialquantity')
        || path.includes('initial_quantity')
        || message.includes('initial quantity')
        || message.includes('initialquantity')
      ),
    },
    {
      field: 'remainingQuantity',
      match: (path, message) => (
        path.includes('remainingquantity')
        || path.includes('remaining_quantity')
        || message.includes('remaining quantity')
        || message.includes('remainingquantity')
      ),
    },
    {
      field: 'sortOrder',
      match: (path, message) => (
        path.includes('sortorder')
        || path.includes('sort_order')
        || message.includes('sort order')
        || message.includes('sortorder')
      ),
    },
    {
      field: 'description',
      match: (path, message) => path.includes('description') || message.includes('description'),
    },
    {
      field: 'name',
      match: (path, message) => path.includes('name') || message.includes('name'),
    },
  ];

  for (const entry of entries) {
    const normalizedMessage = entry.message.toLowerCase();
    const normalizedPath = entry.path.toLowerCase();
    for (const { field, match } of fieldMatchers) {
      if (match(normalizedPath, normalizedMessage)) {
        errors[field] = entry.message;
      }
    }
  }

  if (Object.keys(errors).length === 0) {
    errors.form = entries[0]?.message ?? 'Failed to validate the prize payload.';
  }

  return errors;
}
