import { type IApiValidationErrors } from '@/interfaces/api-response';
import {
  type IAdminKujiPrizeCreateRequest,
  type IAdminKujiPrizeUpdateRequest,
  IKujiPrize,
} from '@/interfaces/product';
import {
  type KujiPrizeTier,
  normalizeKujiPrizeCode,
  normalizeKujiPrizeTier,
  parseKujiPrizeCode,
} from '@/lib/kuji-prize-codes';

export type EditableKujiPrizeField = keyof Pick<
  IKujiPrize,
  'prizeCode' | 'prizeTier' | 'name' | 'description' | 'imageUrl' | 'initialQuantity' | 'remainingQuantity' | 'sortOrder'
>;

export type EditableKujiPrizeTextField = Exclude<EditableKujiPrizeField, 'prizeTier'>;

export type KujiPrizeFormData = {
  prizeCode: string;
  prizeTier: KujiPrizeTier | '';
  invalidPrizeTier: string | null;
  name: string;
  description: string;
  imageUrl: string;
  initialQuantity: string;
  remainingQuantity: string;
  sortOrder: string;
};

export type KujiPrizeFieldErrors = Partial<Record<EditableKujiPrizeField | 'form', string>>;

export type NormalizedKujiPrizeFormData = {
  prizeCode: string | null;
  prizeTier: string | null;
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

type ComparableKujiPrize = Omit<NormalizedKujiPrizeFormData, 'prizeCode' | 'prizeTier' | 'initialQuantity' | 'remainingQuantity' | 'sortOrder'> & {
  prizeCode: string;
  prizeTier: string;
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
};

function createPrizeTierState(prizeTier: string | undefined): Pick<KujiPrizeFormData, 'prizeTier' | 'invalidPrizeTier'> {
  const normalizedPrizeTier = normalizeKujiPrizeTier(prizeTier ?? '');
  const parsedPrizeTier = parseKujiPrizeCode(normalizedPrizeTier);

  if (parsedPrizeTier) {
    return {
      prizeTier: parsedPrizeTier,
      invalidPrizeTier: null,
    };
  }

  return {
    prizeTier: '',
    invalidPrizeTier: normalizedPrizeTier === '' ? null : normalizedPrizeTier,
  };
}

export function createKujiPrizeFormData(
  prize: Partial<Pick<IKujiPrize, EditableKujiPrizeField>> = {},
): KujiPrizeFormData {
  return {
    prizeCode: normalizeKujiPrizeCode(prize.prizeCode ?? ''),
    ...createPrizeTierState(prize.prizeTier),
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
  const normalizedPrizeCode = normalizeKujiPrizeCode(formData.prizeCode);
  const normalizedPrizeTier = formData.prizeTier === ''
    ? ''
    : normalizeKujiPrizeTier(formData.prizeTier);

  return {
    prizeCode: normalizedPrizeCode === '' ? null : normalizedPrizeCode,
    prizeTier: normalizedPrizeTier === '' ? null : normalizedPrizeTier,
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
    prizeCode: normalizeKujiPrizeCode(prize.prizeCode),
    prizeTier: normalizeKujiPrizeTier(prize.prizeTier),
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
    errors.prizeCode = 'Prize code is required.';
  }

  if (formData.prizeTier === null) {
    errors.prizeTier = 'Prize tier is required.';
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
    formData.prizeTier === null ||
    formData.initialQuantity === null ||
    formData.remainingQuantity === null ||
    formData.sortOrder === null
  ) {
    throw new Error('Kuji prize payload requires a valid prize code, prize tier, numeric quantity, and sort order values.');
  }

  return {
    prizeCode: formData.prizeCode,
    prizeTier: formData.prizeTier,
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

  if (formData.prizeTier !== null && formData.prizeTier !== originalPrize.prizeTier) {
    payload.prizeTier = formData.prizeTier;
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
      field: 'prizeTier',
      match: (path, message) => (
        path.includes('prizetier')
        || path.includes('prize_tier')
        || message.includes('prize tier')
        || message.includes('prizetier')
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

export function hasDuplicatePrizeCode(
  prizes: Pick<IKujiPrize, 'id' | 'prizeCode'>[],
  prizeCode: string | null,
  excludePrizeId?: string,
): boolean {
  if (!prizeCode) {
    return false;
  }

  const normalizedPrizeCode = normalizeKujiPrizeCode(prizeCode);

  return prizes.some((prize) => (
    prize.id !== excludePrizeId &&
    normalizeKujiPrizeCode(prize.prizeCode) === normalizedPrizeCode
  ));
}

export function getDuplicatePrizeCodeMessage(): string {
  return 'A prize with this code already exists for this product. Use a unique prize code.';
}
