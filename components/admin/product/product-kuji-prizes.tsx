'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError, HttpStatusCode } from 'axios';
import { Pencil, Plus, RotateCw, Trash, X } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { IAdminProductEditor, IKujiPrize } from '@/interfaces/product';
import { uploadAdminProductKujiPrizeImage } from '@/lib/api/admin-client';
import { cn } from '@/lib/utils';

import { EditKujiPrizeModal } from './edit-kuji-prize-modal';
import {
  EditableKujiPrizeField,
  KujiPrizeFieldErrors,
  KujiPrizeFormData,
  buildKujiPrizeCreatePayload,
  createKujiPrizeFormData,
  mapKujiPrizeServerValidationErrors,
  normalizeKujiPrizeFormData,
  validateKujiPrizeFormData,
} from './kuji-prize-form-utils';

type KujiPrizeToast = {
  id: number;
  type: 'success' | 'error';
  message: string;
};

interface IKujiPrizeToastBannerProps {
  toast: KujiPrizeToast;
  onDismiss: () => void;
}

interface ICreatePrizeImageFieldProps {
  inputKey: number;
  selectedFile: File | null;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function getFieldClasses(hasError: boolean): string {
  return cn(hasError && 'border-red-400 focus-visible:ring-red-400');
}

function KujiPrizeToastBanner({ toast, onDismiss }: IKujiPrizeToastBannerProps) {
  return (
    <div className="fixed right-4 top-4 z-[70] w-[min(calc(100vw-2rem),24rem)]">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
          toast.type === 'success'
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
            : 'border-red-200 bg-red-50/95 text-red-900'
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-6 w-6 rounded-md p-0 hover:bg-black/5"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CreatePrizeImageField({
  inputKey,
  selectedFile,
  disabled,
  onChange,
  onClear,
}: ICreatePrizeImageFieldProps) {
  return (
    <div className="sm:col-span-2">
      <label className="mb-1 block text-xs font-medium text-[#514349]">Prize Image File</label>
      <Input
        key={inputKey}
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={disabled}
        className="h-auto text-sm"
      />
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#514349]">
        {selectedFile ? (
          <>
            <span className="font-medium text-[#191C1E]">Selected:</span>
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
          <span>Upload a file to generate the image URL automatically on submit.</span>
        )}
      </div>
    </div>
  );
}

function createNewPrizeFormData(nextSortOrder: number): KujiPrizeFormData {
  return createKujiPrizeFormData({
    initialQuantity: 1,
    remainingQuantity: 1,
    sortOrder: nextSortOrder,
  });
}

export function ProductKujiPrizes({ product }: { product: IAdminProductEditor }) {
  const queryClient = useQueryClient();
  const toastTimeoutRef = useRef<number | null>(null);
  const [editingPrize, setEditingPrize] = useState<IKujiPrize | null>(null);
  const [toast, setToast] = useState<KujiPrizeToast | null>(null);
  const [createErrors, setCreateErrors] = useState<KujiPrizeFieldErrors>({});
  const [newPrize, setNewPrize] = useState<KujiPrizeFormData>(() => createNewPrizeFormData(product.kujiPrizes.length));
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImageInputKey, setCreateImageInputKey] = useState(0);
  const [isUploadingCreateImage, setIsUploadingCreateImage] = useState(false);

  const { data: prizesRes, isPending, refetch } = useCustomizeQuery({
    queryKey: ['admin', 'prizes', product.id],
    queryFn: () => QueryConfigs.fetchAdminProductKujiPrizes(product.id),
  });

  const prizes = prizesRes?.data?.data || [];
  const sortedPrizes = [...prizes].sort((a, b) => a.sortOrder - b.sortOrder);
  const normalizedNewPrize = normalizeKujiPrizeFormData(newPrize);
  const textareaClasses = 'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const { mutation: createPrize, isPending: isCreating } = useCustomizeMutation({
    mutationFn: MutationConfigs.createAdminProductKujiPrize,
    onSuccess: () => {
      const nextSortOrder = sortedPrizes.length + 1;

      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', product.id] });
      setNewPrize(createNewPrizeFormData(nextSortOrder));
      setCreateImageFile(null);
      setCreateImageInputKey((currentKey) => currentKey + 1);
      setCreateErrors({});
      showToast('success', 'Prize created successfully.');
    },
    onError: (error: AxiosError<IBaseApiResponse>) => {
      const message = error.response?.data?.message ?? 'Failed to create prize.';
      const status = error.response?.status;

      if (status === HttpStatusCode.BadRequest) {
        setCreateErrors(mapKujiPrizeServerValidationErrors(message));
        return;
      }

      if (status === HttpStatusCode.Conflict) {
        showToast('error', 'Inventory conflict. Check quantities.');
        return;
      }

      showToast('error', message);
    },
  });

  const { mutation: deletePrize, isPending: isDeleting } = useCustomizeMutation({
    mutationFn: MutationConfigs.deleteAdminProductKujiPrize,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', product.id] });
    },
  });

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (type: KujiPrizeToast['type'], message: string) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    const nextToastId = Date.now();
    setToast({
      id: nextToastId,
      type,
      message,
    });

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((currentToast) => (currentToast?.id === nextToastId ? null : currentToast));
      toastTimeoutRef.current = null;
    }, 4000);
  };

  const handleCreateFieldChange = (field: EditableKujiPrizeField, value: string) => {
    setNewPrize((currentPrize) => ({
      ...currentPrize,
      [field]: value,
    }));

    setCreateErrors((currentErrors) => {
      if (!currentErrors[field] && !currentErrors.form) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const clearCreateImageSelection = () => {
    setCreateImageFile(null);
    setCreateImageInputKey((currentKey) => currentKey + 1);
  };

  const handleCreateImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setCreateImageFile(nextFile);

    setCreateErrors((currentErrors) => {
      if (!currentErrors.imageUrl && !currentErrors.form) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors.imageUrl;
      delete nextErrors.form;
      return nextErrors;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = validateKujiPrizeFormData(normalizedNewPrize, {
      skipImageUrlValidation: createImageFile !== null,
    });

    if (Object.keys(nextErrors).length > 0) {
      setCreateErrors(nextErrors);
      return;
    }

    let imageUrl = normalizedNewPrize.imageUrl;

    if (createImageFile) {
      setIsUploadingCreateImage(true);

      try {
        const uploadResponse = await uploadAdminProductKujiPrizeImage(product.id, createImageFile);
        imageUrl = uploadResponse.data.data.imageUrl;
      } catch (error) {
        const message = error instanceof AxiosError
          ? error.response?.data?.message ?? 'Failed to upload image.'
          : 'Failed to upload image.';

        setCreateErrors((currentErrors) => ({
          ...currentErrors,
          form: message,
        }));
        showToast('error', message);
        return;
      } finally {
        setIsUploadingCreateImage(false);
      }
    }

    createPrize({
      productId: product.id,
      data: buildKujiPrizeCreatePayload({
        ...normalizedNewPrize,
        imageUrl,
      }),
    });
  };

  return (
    <>
      {toast ? <KujiPrizeToastBanner toast={toast} onDismiss={() => setToast(null)} /> : null}

      <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#D5C1C9]/20 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Kuji Prizes</h2>
            <p className="mt-1 text-xs text-[#514349]">Manage the prize pool for this Kuji product.</p>
          </div>
          <Button
            type="button"
            onClick={() => refetch()}
            className="h-8 gap-1.5 rounded-lg px-3 text-sm font-medium text-[#191C1E] hover:bg-primary/60"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh Pool
          </Button>
        </div>

        <div className="space-y-4 mb-8">
          {isPending ? (
            <div className="py-8 text-center text-sm text-[#514349]">Loading prizes...</div>
          ) : sortedPrizes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D5C1C9] bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-[#514349]">No prizes added to this pull list yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#D5C1C9]/50">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#E6E8EA]/30 text-[#514349]">
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium text-right">Sort</th>
                    <th className="px-3 py-2 font-medium text-right">Initial List</th>
                    <th className="px-3 py-2 font-medium text-right">Remaining</th>
                    <th className="px-3 py-2 font-medium text-right">Sold</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5C1C9]/30">
                  {sortedPrizes.map((prize) => (
                    <tr key={prize.id} className="group hover:bg-[#F2F4F6]/50 transition-colors">
                      <td className="px-3 py-2 font-semibold text-primary">{prize.prizeCode}</td>
                      <td className="px-3 py-2 font-medium text-[#191C1E]">{prize.name}</td>
                      <td className="px-3 py-2 text-right text-[#514349]">{prize.sortOrder}</td>
                      <td className="px-3 py-2 text-right text-[#514349]">{prize.initialQuantity}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 font-medium ${prize.remainingQuantity === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                          {prize.remainingQuantity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-[#514349]">
                        {prize.initialQuantity - prize.remainingQuantity}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingPrize(prize)}
                            className="h-8 w-8 rounded-md text-[#514349] hover:text-[#191C1E]"
                            title="Edit Prize"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isDeleting}
                            onClick={() => deletePrize({ productId: product.id, prizeId: prize.id })}
                            className="h-8 w-8 rounded-md text-red-500 hover:text-red-600"
                            title="Delete Prize"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-[#F9FAFB] p-4 border border-[#D5C1C9]/30">
          <h3 className="mb-3 text-sm font-medium text-[#191C1E]">Add New Prize</h3>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-start">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#514349]">Rank (e.g. A)</label>
              <Input
                required
                maxLength={32}
                value={newPrize.prizeCode}
                onChange={(event) => handleCreateFieldChange('prizeCode', event.target.value)}
                className={cn('h-8 text-sm', getFieldClasses(Boolean(createErrors.prizeCode)))}
              />
              {createErrors.prizeCode ? <p className="mt-1 text-xs text-red-600">{createErrors.prizeCode}</p> : null}
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#514349]">Prize Name</label>
              <Input
                required
                value={newPrize.name}
                onChange={(event) => handleCreateFieldChange('name', event.target.value)}
                className={cn('h-8 text-sm', getFieldClasses(Boolean(createErrors.name)))}
                placeholder="e.g. Grand Figure"
              />
              {createErrors.name ? <p className="mt-1 text-xs text-red-600">{createErrors.name}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#514349]">Initial Qty</label>
              <NumericInput
                required
                value={newPrize.initialQuantity}
                onValueChange={(value) => handleCreateFieldChange('initialQuantity', value)}
                className={cn('h-8 text-sm', getFieldClasses(Boolean(createErrors.initialQuantity)))}
                placeholder="0"
              />
              {createErrors.initialQuantity ? <p className="mt-1 text-xs text-red-600">{createErrors.initialQuantity}</p> : null}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#514349]">Description</label>
              <textarea
                value={newPrize.description}
                onChange={(event) => handleCreateFieldChange('description', event.target.value)}
                className={cn(textareaClasses, getFieldClasses(Boolean(createErrors.description)))}
                placeholder="Optional prize details"
              />
              {createErrors.description ? <p className="mt-1 text-xs text-red-600">{createErrors.description}</p> : null}
            </div>

            <CreatePrizeImageField
              inputKey={createImageInputKey}
              selectedFile={createImageFile}
              disabled={isCreating || isUploadingCreateImage}
              onChange={handleCreateImageFileChange}
              onClear={clearCreateImageSelection}
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-[#514349]">Remaining Qty</label>
              <NumericInput
                required
                value={newPrize.remainingQuantity}
                onValueChange={(value) => handleCreateFieldChange('remainingQuantity', value)}
                className={cn('h-8 text-sm', getFieldClasses(Boolean(createErrors.remainingQuantity)))}
                placeholder="0"
              />
              {createErrors.remainingQuantity ? <p className="mt-1 text-xs text-red-600">{createErrors.remainingQuantity}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#514349]">Sort Order</label>
              <NumericInput
                required
                value={newPrize.sortOrder}
                onValueChange={(value) => handleCreateFieldChange('sortOrder', value)}
                className={cn('h-8 text-sm', getFieldClasses(Boolean(createErrors.sortOrder)))}
                placeholder="0"
              />
              {createErrors.sortOrder ? <p className="mt-1 text-xs text-red-600">{createErrors.sortOrder}</p> : null}
            </div>

            <div className="lg:col-span-2">
              {createErrors.form ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {createErrors.form}
                </div>
              ) : (
                <p className="text-xs text-[#514349]">
                  Optional fields send `null` when left blank. Quantities and sort order always submit as numbers.
                </p>
              )}
            </div>

            <div className="flex justify-end lg:col-span-2">
              <Button
                type="submit"
                disabled={isCreating || isUploadingCreateImage}
                className="h-8 rounded-md px-3 text-xs font-medium"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {isUploadingCreateImage ? 'Uploading...' : isCreating ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <EditKujiPrizeModal
        open={editingPrize !== null}
        prize={editingPrize}
        productId={product.id}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPrize(null);
          }
        }}
        onNotify={({ type, message }) => showToast(type, message)}
      />
    </>
  );
}
