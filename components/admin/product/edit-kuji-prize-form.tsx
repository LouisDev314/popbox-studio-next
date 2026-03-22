'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError, HttpStatusCode } from 'axios';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { IKujiPrize } from '@/interfaces/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type EditableKujiPrizeField = keyof Pick<
  IKujiPrize,
  'prizeCode' | 'name' | 'description' | 'imageUrl' | 'initialQuantity' | 'remainingQuantity' | 'sortOrder'
>;

type EditKujiPrizeFormData = {
  prizeCode: string;
  name: string;
  description: string;
  imageUrl: string;
  initialQuantity: string;
  remainingQuantity: string;
  sortOrder: string;
};

type EditKujiPrizeFieldErrors = Partial<Record<EditableKujiPrizeField | 'form', string>>;

type EditKujiPrizeNotification = {
  type: 'success' | 'error';
  message: string;
};

interface IEditKujiPrizeFormProps {
  productId: string;
  prize: IKujiPrize;
  onCancel: () => void;
  onSuccess: () => void;
  onNotify: (notification: EditKujiPrizeNotification) => void;
}

type NormalizedKujiPrizeFormData = {
  prizeCode: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  initialQuantity: number | null;
  remainingQuantity: number | null;
  sortOrder: number | null;
};

function createInitialFormData(prize: IKujiPrize): EditKujiPrizeFormData {
  return {
    prizeCode: prize.prizeCode,
    name: prize.name,
    description: prize.description ?? '',
    imageUrl: prize.imageUrl ?? '',
    initialQuantity: String(prize.initialQuantity),
    remainingQuantity: String(prize.remainingQuantity),
    sortOrder: String(prize.sortOrder),
  };
}

function normalizeRequiredText(value: string): string {
  return value.trim();
}

function normalizeOptionalText(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue === '' ? null : trimmedValue;
}

function parseNonNegativeInteger(value: string): number | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '' || !/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeFormData(formData: EditKujiPrizeFormData): NormalizedKujiPrizeFormData {
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

function normalizePrizeForComparison(prize: IKujiPrize): Omit<NormalizedKujiPrizeFormData, 'initialQuantity' | 'remainingQuantity' | 'sortOrder'> & {
  initialQuantity: number;
  remainingQuantity: number;
  sortOrder: number;
} {
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

function validateFormData(formData: NormalizedKujiPrizeFormData): EditKujiPrizeFieldErrors {
  const errors: EditKujiPrizeFieldErrors = {};

  if (formData.prizeCode === '') {
    errors.prizeCode = 'Prize code is required.';
  }

  if (formData.name === '') {
    errors.name = 'Prize name is required.';
  }

  if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
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

function buildUpdatePayload(
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

function mapServerValidationErrors(message: string): EditKujiPrizeFieldErrors {
  const normalizedMessage = message.toLowerCase();
  const errors: EditKujiPrizeFieldErrors = {};

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

function getFieldClasses(hasError: boolean): string {
  return cn(hasError && 'border-red-400 focus-visible:ring-red-400');
}

export function EditKujiPrizeForm({ productId, prize, onCancel, onSuccess, onNotify }: IEditKujiPrizeFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() => createInitialFormData(prize));
  const [errors, setErrors] = useState<EditKujiPrizeFieldErrors>({});
  const normalizedFormData = normalizeFormData(formData);
  const payload = buildUpdatePayload(prize, normalizedFormData);
  const soldCount = normalizedFormData.initialQuantity !== null && normalizedFormData.remainingQuantity !== null
    ? normalizedFormData.initialQuantity - normalizedFormData.remainingQuantity
    : null;
  const isDirty = Object.keys(payload).length > 0;
  const textareaClasses = cn(
    'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  );

  const { mutation: updatePrize, isPending } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProductKujiPrize,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', productId] });
      onNotify({ type: 'success', message: 'Prize updated successfully.' });
      onSuccess();
    },
    onError: (error: AxiosError<IBaseApiResponse>) => {
      const message = error.response?.data?.message ?? 'Failed to update prize.';
      const status = error.response?.status;

      if (status === HttpStatusCode.BadRequest) {
        setErrors(mapServerValidationErrors(message));
        return;
      }

      if (status === HttpStatusCode.Conflict) {
        onNotify({ type: 'error', message: 'Inventory conflict. Check quantities.' });
        return;
      }

      if (status === HttpStatusCode.NotFound) {
        onNotify({ type: 'error', message: 'Failed to update prize.' });
        return;
      }

      onNotify({ type: 'error', message });
    },
  });

  const handleFieldChange = (field: EditableKujiPrizeField, value: string) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field] && !currentErrors.form) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateFormData(normalizedFormData);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isDirty) {
      return;
    }

    updatePrize({
      productId,
      prizeId: prize.id,
      data: payload,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Prize Code</label>
          <Input
            required
            maxLength={32}
            value={formData.prizeCode}
            onChange={(event) => handleFieldChange('prizeCode', event.target.value)}
            className={getFieldClasses(Boolean(errors.prizeCode))}
          />
          {errors.prizeCode ? <p className="mt-1 text-xs text-red-600">{errors.prizeCode}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Prize Name</label>
          <Input
            required
            value={formData.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            className={getFieldClasses(Boolean(errors.name))}
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Description</label>
          <textarea
            value={formData.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            className={cn(textareaClasses, getFieldClasses(Boolean(errors.description)))}
            placeholder="Optional prize details"
          />
          {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Image URL</label>
          <Input
            type="url"
            value={formData.imageUrl}
            onChange={(event) => handleFieldChange('imageUrl', event.target.value)}
            className={getFieldClasses(Boolean(errors.imageUrl))}
            placeholder="https://example.com/prize-image.jpg"
          />
          {errors.imageUrl ? <p className="mt-1 text-xs text-red-600">{errors.imageUrl}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Initial Quantity</label>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={formData.initialQuantity}
            onChange={(event) => handleFieldChange('initialQuantity', event.target.value)}
            className={getFieldClasses(Boolean(errors.initialQuantity))}
          />
          {errors.initialQuantity ? <p className="mt-1 text-xs text-red-600">{errors.initialQuantity}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Remaining Quantity</label>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={formData.remainingQuantity}
            onChange={(event) => handleFieldChange('remainingQuantity', event.target.value)}
            className={getFieldClasses(Boolean(errors.remainingQuantity))}
          />
          {errors.remainingQuantity ? <p className="mt-1 text-xs text-red-600">{errors.remainingQuantity}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Sort Order</label>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={formData.sortOrder}
            onChange={(event) => handleFieldChange('sortOrder', event.target.value)}
            className={getFieldClasses(Boolean(errors.sortOrder))}
          />
          {errors.sortOrder ? <p className="mt-1 text-xs text-red-600">{errors.sortOrder}</p> : null}
        </div>

        <div className="rounded-xl border border-[#D5C1C9]/30 bg-[#FBFAFB] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#514349]">Sold Count</p>
          <p className="mt-2 text-2xl font-semibold text-[#191C1E]">{soldCount ?? '—'}</p>
          <p className="mt-1 text-xs text-[#514349]">Calculated as initial quantity minus remaining quantity.</p>
        </div>
      </div>

      {errors.form ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#514349]">
          {isDirty ? 'Unsaved changes.' : 'No changes to save.'}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !isDirty}
            className="rounded-lg"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
