'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError, HttpStatusCode } from 'axios';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { IKujiPrize } from '@/interfaces/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadAdminProductKujiPrizeImage } from '@/lib/api/admin-client';
import { KUJI_PRIZE_CODES, isKujiPrizeCode } from '@/lib/kuji-prize-codes';
import { cn } from '@/lib/utils';
import {
  EditableKujiPrizeField,
  EditableKujiPrizeTextField,
  KujiPrizeFieldErrors,
  KujiPrizeFormData,
  buildKujiPrizeUpdatePayload,
  createKujiPrizeFormData,
  mapKujiPrizeServerValidationErrors,
  normalizeKujiPrizeFormData,
  validateKujiPrizeFormData,
} from './kuji-prize-form-utils';

const INVALID_PRIZE_CODE_SELECT_VALUE = '__invalid_prize_code__';

type EditKujiPrizeNotification = {
  type: 'success' | 'error';
  message: string;
};

interface ICurrentPrizeImagePanelProps {
  prize: IKujiPrize;
}

interface IReplacePrizeImageFieldProps {
  inputKey: number;
  selectedFile: File | null;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

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

function CurrentPrizeImagePanel({ prize }: ICurrentPrizeImagePanelProps) {
  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-foreground">Current Image</label>
      {prize.imageUrl ? (
        <div className="rounded-xl border border-border/30 bg-background p-4">
          <div className="relative h-40 overflow-hidden rounded-lg bg-muted sm:h-48">
            <Image
              src={prize.imageUrl}
              alt={prize.name}
              fill
              sizes="(max-width: 639px) calc(100vw - 4rem), 24rem"
              className="object-cover"
              unoptimized
            />
          </div>
          <p className="mt-2 truncate text-xs text-muted-foreground">{prize.imageUrl}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/40 bg-background px-4 py-6 text-sm text-muted-foreground">
          No image assigned yet.
        </div>
      )}
    </div>
  );
}

function ReplacePrizeImageField({
  inputKey,
  selectedFile,
  disabled,
  onChange,
  onClear,
}: IReplacePrizeImageFieldProps) {
  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-medium text-foreground">Replace Image File</label>
      <Input
        key={inputKey}
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={disabled}
        className="h-auto"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {selectedFile ? (
          <>
            <span className="font-medium text-foreground">Selected:</span>
            <span className="max-w-full truncate">{selectedFile.name}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={disabled}
              className="h-7 rounded-md px-2 text-xs"
            >
              Remove file
            </Button>
          </>
        ) : (
          <span>Leave blank to keep the current image URL or use the manual URL field below.</span>
        )}
      </div>
    </div>
  );
}

// This form intentionally keeps related edit logic colocated for the modal workflow.
// eslint-disable-next-line complexity
export function EditKujiPrizeForm({ productId, prize, onCancel, onSuccess, onNotify }: IEditKujiPrizeFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<KujiPrizeFormData>(() => createKujiPrizeFormData(prize));
  const [errors, setErrors] = useState<KujiPrizeFieldErrors>({});
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const normalizedFormData = normalizeKujiPrizeFormData(formData);
  const basePayload = buildKujiPrizeUpdatePayload(prize, normalizedFormData);
  const soldCount = normalizedFormData.initialQuantity !== null && normalizedFormData.remainingQuantity !== null
    ? normalizedFormData.initialQuantity - normalizedFormData.remainingQuantity
    : null;
  const isDirty = selectedImageFile !== null || Object.keys(basePayload).length > 0;
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
        setErrors(
          mapKujiPrizeServerValidationErrors(
            error.response?.data?.errors ?? message,
          ),
        );
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

  const clearFieldError = (field: EditableKujiPrizeField) => {
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

  const handlePrizeCodeChange = (value: string | null) => {
    if (!value || !isKujiPrizeCode(value)) {
      return;
    }

    setFormData((currentFormData) => ({
      ...currentFormData,
      prizeCode: value,
      invalidPrizeCode: null,
    }));

    clearFieldError('prizeCode');
  };

  const handleFieldChange = (field: EditableKujiPrizeTextField, value: string) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));

    clearFieldError(field);
  };

  const clearSelectedImageFile = () => {
    setSelectedImageFile(null);
    setImageInputKey((currentKey) => currentKey + 1);
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedImageFile(nextFile);

    setErrors((currentErrors) => {
      if (!currentErrors.imageUrl && !currentErrors.form) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors.imageUrl;
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateKujiPrizeFormData(normalizedFormData, {
      skipImageUrlValidation: selectedImageFile !== null,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isDirty) {
      return;
    }

    let imageUrl = normalizedFormData.imageUrl;

    if (selectedImageFile) {
      setIsUploadingImage(true);

      try {
        const uploadResponse = await uploadAdminProductKujiPrizeImage(productId, selectedImageFile);
        imageUrl = uploadResponse.data.data.imageUrl;
      } catch (error) {
        const message = error instanceof AxiosError
          ? error.response?.data?.message ?? 'Failed to upload image.'
          : 'Failed to upload image.';

        setErrors((currentErrors) => ({
          ...currentErrors,
          form: message,
        }));
        onNotify({ type: 'error', message });
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    const payload = buildKujiPrizeUpdatePayload(prize, {
      ...normalizedFormData,
      imageUrl,
    });

    if (Object.keys(payload).length === 0) {
      onSuccess();
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
          <label className="mb-1.5 block text-sm font-medium text-foreground">Rank (e.g. A)</label>
          <Select
            value={formData.invalidPrizeCode ? INVALID_PRIZE_CODE_SELECT_VALUE : formData.prizeCode}
            onValueChange={handlePrizeCodeChange}
            modal={false}
          >
            <SelectTrigger
              className={cn('w-full', getFieldClasses(Boolean(errors.prizeCode)))}
              aria-label="Rank (e.g. A)"
            >
              <SelectValue className={cn(!formData.prizeCode && !formData.invalidPrizeCode && 'text-muted-foreground')}>
                {formData.invalidPrizeCode
                  ? `${formData.invalidPrizeCode} (unsupported current value)`
                  : formData.prizeCode || 'Select rank'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {formData.invalidPrizeCode ? (
                  <>
                    <SelectItem value={INVALID_PRIZE_CODE_SELECT_VALUE} disabled>
                      {formData.invalidPrizeCode} (unsupported current value)
                    </SelectItem>
                    <SelectSeparator />
                  </>
                ) : null}
                {KUJI_PRIZE_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {formData.invalidPrizeCode ? (
            <p className="mt-1 text-xs text-amber-600">Choose a valid rank before saving this prize.</p>
          ) : null}
          {errors.prizeCode ? <p className="mt-1 text-xs text-red-600">{errors.prizeCode}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Prize Name</label>
          <Input
            required
            value={formData.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            className={getFieldClasses(Boolean(errors.name))}
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
          <textarea
            value={formData.description}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            className={cn(textareaClasses, getFieldClasses(Boolean(errors.description)))}
            placeholder="Optional prize details"
          />
          {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
        </div>

        <CurrentPrizeImagePanel prize={prize} />

        <ReplacePrizeImageField
          inputKey={imageInputKey}
          selectedFile={selectedImageFile}
          disabled={isPending || isUploadingImage}
          onChange={handleImageFileChange}
          onClear={clearSelectedImageFile}
        />

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Image URL</label>
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
          <label className="mb-1.5 block text-sm font-medium text-foreground">Initial Quantity</label>
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
          <label className="mb-1.5 block text-sm font-medium text-foreground">Remaining Quantity</label>
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
          <label className="mb-1.5 block text-sm font-medium text-foreground">Sort Order</label>
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

        <div className="rounded-xl border border-border/30 bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sold Count</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{soldCount ?? '—'}</p>
          <p className="mt-1 text-xs text-muted-foreground">Calculated as initial quantity minus remaining quantity.</p>
        </div>
      </div>

      {errors.form ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {isDirty ? 'Unsaved changes.' : 'No changes to save.'}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending || isUploadingImage}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || isUploadingImage || !isDirty}
            className="rounded-lg"
          >
            {isUploadingImage ? 'Uploading...' : isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
