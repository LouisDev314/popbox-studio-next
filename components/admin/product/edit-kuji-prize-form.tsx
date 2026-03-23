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
import {
  EditableKujiPrizeField,
  KujiPrizeFieldErrors,
  KujiPrizeFormData,
  buildKujiPrizeUpdatePayload,
  createKujiPrizeFormData,
  mapKujiPrizeServerValidationErrors,
  normalizeKujiPrizeFormData,
  validateKujiPrizeFormData,
} from './kuji-prize-form-utils';

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

function getFieldClasses(hasError: boolean): string {
  return cn(hasError && 'border-red-400 focus-visible:ring-red-400');
}

export function EditKujiPrizeForm({ productId, prize, onCancel, onSuccess, onNotify }: IEditKujiPrizeFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<KujiPrizeFormData>(() => createKujiPrizeFormData(prize));
  const [errors, setErrors] = useState<KujiPrizeFieldErrors>({});
  const normalizedFormData = normalizeKujiPrizeFormData(formData);
  const payload = buildKujiPrizeUpdatePayload(prize, normalizedFormData);
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
        setErrors(mapKujiPrizeServerValidationErrors(message));
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

    const nextErrors = validateKujiPrizeFormData(normalizedFormData);

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
