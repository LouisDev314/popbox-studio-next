'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AxiosError, HttpStatusCode } from 'axios';
import { LoaderCircle, Pencil, Plus, RotateCw, Trash, X } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IAdminProductEditor, IKujiPrize } from '@/interfaces/product';
import { uploadAdminProductKujiPrizeImage } from '@/lib/api/admin-client';
import { formatQuantity } from '@/lib/format-quantity';
import {
  KUJI_PRIZE_TIERS,
  getAdminPrizeTierLabel,
  isKujiPrizeCode,
} from '@/lib/kuji-prize-codes';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/utils/api-errors';

import { EditKujiPrizeModal } from './edit-kuji-prize-modal';
import {
  buildSortOrderUpdates,
  moveSortableItems,
  orderSortableItemsByIds,
} from './reorder-utils';
import {
  EditableKujiPrizeField,
  EditableKujiPrizeTextField,
  KujiPrizeFieldErrors,
  KujiPrizeFormData,
  buildKujiPrizeCreatePayload,
  createKujiPrizeFormData,
  getDuplicatePrizeCodeMessage,
  hasDuplicatePrizeCode,
  mapKujiPrizeServerValidationErrors,
  normalizeKujiPrizeFormData,
  validateKujiPrizeFormData,
} from './kuji-prize-form-utils';
import { SortableHandle, useAdminSortable } from './sortable-admin-item';

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

interface IReorderPrizeRequest {
  productId: string;
  updates: Array<{
    prizeId: string;
    sortOrder: number;
  }>;
}

interface ISortablePrizeRowProps {
  prize: IKujiPrize;
  isDeleting: boolean;
  isReordering: boolean;
  onDelete: (prizeId: string) => void;
  onEdit: (prize: IKujiPrize) => void;
}

function getFieldClasses(hasError: boolean): string {
  return cn(hasError && 'border-red-400 focus-visible:ring-red-400');
}

function KujiPrizeToastBanner({ toast, onDismiss }: IKujiPrizeToastBannerProps) {
  return (
    <div className="fixed right-4 top-4 z-[70] w-[min(calc(100vw-2rem),24rem)]">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
          toast.type === 'success'
            ? 'border-primary/20 bg-primary/10 text-foreground'
            : 'border-primary/20 bg-accent text-foreground'
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
      <label className="mb-1 block text-xs font-medium text-muted-foreground">Prize Image File</label>
      <Input
        key={inputKey}
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={disabled}
        className="h-auto text-sm"
      />
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {selectedFile && (
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
        )}
      </div>
    </div>
  );
}

function SortablePrizeRow({
  prize,
  isDeleting,
  isReordering,
  onDelete,
  onEdit,
}: ISortablePrizeRowProps) {
  const isInteractionDisabled = isDeleting || isReordering;
  const { handleProps, isDragging, setNodeRef, style } = useAdminSortable(
    prize.id,
    isInteractionDisabled,
  );

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'group transition-[background-color,box-shadow] hover:bg-muted/50',
        isDragging && 'bg-card shadow-[0_10px_24px_rgba(25,28,30,0.12)]',
      )}
    >
      <td className="px-2 py-2">
        <SortableHandle
          label={`Reorder prize ${prize.prizeCode}`}
          disabled={isInteractionDisabled}
          handleProps={handleProps}
          className="mx-auto"
        />
      </td>
      <td className="px-3 py-2">
        <div className="min-w-48">
          <p className="font-semibold text-primary">
            {prize.prizeCode} <span className="text-muted-foreground">·</span> {getAdminPrizeTierLabel(prize.prizeTier)}
          </p>
          <p className="mt-0.5 truncate font-medium text-foreground">{prize.name}</p>
        </div>
      </td>
      <td className="px-3 py-2 text-right text-muted-foreground">{prize.sortOrder}</td>
      <td className="px-3 py-2 text-right text-muted-foreground">{prize.initialQuantity}</td>
      <td className="px-3 py-2 text-right">
        <span className={`inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 font-medium ${prize.remainingQuantity === 0 ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
          {formatQuantity(prize.remainingQuantity)}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-muted-foreground">
        {prize.initialQuantity - prize.remainingQuantity}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isInteractionDisabled}
            onClick={() => onEdit(prize)}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            title="Edit Prize"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isInteractionDisabled}
            onClick={() => onDelete(prize.id)}
            className="h-8 w-8 rounded-md text-red-500 hover:text-red-600"
            title="Delete Prize"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
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
  const prizeOrderRollbackRef = useRef<string[] | null>(null);
  const [editingPrize, setEditingPrize] = useState<IKujiPrize | null>(null);
  const [toast, setToast] = useState<KujiPrizeToast | null>(null);
  const [optimisticPrizeIds, setOptimisticPrizeIds] = useState<string[] | null>(null);
  const [createErrors, setCreateErrors] = useState<KujiPrizeFieldErrors>({});
  const [newPrize, setNewPrize] = useState<KujiPrizeFormData>(() => createNewPrizeFormData(product.kujiPrizes.length));
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImageInputKey, setCreateImageInputKey] = useState(0);
  const [isUploadingCreateImage, setIsUploadingCreateImage] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { data: prizesRes, isPending, refetch } = useCustomizeQuery({
    queryKey: ['admin', 'prizes', product.id],
    queryFn: () => QueryConfigs.fetchAdminProductKujiPrizes(product.id),
  });

  const serverPrizes = useMemo(
    () => [...(prizesRes?.data?.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [prizesRes],
  );
  const sortedPrizes = useMemo(
    () => orderSortableItemsByIds(serverPrizes, optimisticPrizeIds),
    [optimisticPrizeIds, serverPrizes],
  );
  const normalizedNewPrize = normalizeKujiPrizeFormData(newPrize);
  const textareaClasses = 'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const { mutation: createPrize, isPending: isCreating } = useCustomizeMutation({
    mutationFn: MutationConfigs.createAdminProductKujiPrize,
    onSuccess: () => {
      const nextSortOrder = sortedPrizes.length + 1;

      setOptimisticPrizeIds(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', product.id] });
      setNewPrize(createNewPrizeFormData(nextSortOrder));
      setCreateImageFile(null);
      setCreateImageInputKey((currentKey) => currentKey + 1);
      setCreateErrors({});
      showToast('success', 'Prize created successfully.');
    },
    onError: (error: AxiosError<IBaseApiResponse>) => {
      const message = getFriendlyErrorMessage(error, 'Failed to create prize.');
      const status = error.response?.status;

      if (status === HttpStatusCode.BadRequest) {
        setCreateErrors(
          mapKujiPrizeServerValidationErrors(
            error.response?.data?.errors ?? message,
          ),
        );
        return;
      }

      if (status === HttpStatusCode.Conflict) {
        setCreateErrors((currentErrors) => ({
          ...currentErrors,
          prizeCode: getDuplicatePrizeCodeMessage(),
        }));
        return;
      }

      setCreateErrors((currentErrors) => ({
        ...currentErrors,
        form: message,
      }));
    },
  });

  const { mutation: deletePrize, isPending: isDeleting } = useCustomizeMutation({
    mutationFn: MutationConfigs.deleteAdminProductKujiPrize,
    onSuccess: () => {
      setOptimisticPrizeIds(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', product.id] });
    },
  });

  const { mutation: reorderPrizes, isPending: isReorderingPrizes } = useCustomizeMutation({
    mutationFn: async ({ productId, updates }: IReorderPrizeRequest) => {
      const responses = await Promise.all(
        updates.map((update) =>
          MutationConfigs.updateAdminProductKujiPrize({
            productId,
            prizeId: update.prizeId,
            data: {
              sortOrder: update.sortOrder,
            },
          }),
        ),
      );

      return responses[responses.length - 1];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', product.id] });
      showToast('success', 'Prize order saved.');
    },
    onError: (error: AxiosError<IBaseApiResponse>) => {
      setOptimisticPrizeIds(prizeOrderRollbackRef.current);

      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', product.id] });

      showToast('error', error.response?.data?.message ?? 'Failed to save prize order.');
    },
    onSettled: () => {
      prizeOrderRollbackRef.current = null;
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

  const clearCreateFieldError = (field: EditableKujiPrizeField) => {
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

  const handleCreatePrizeCodeChange = (value: string) => {
    setNewPrize((currentPrize) => ({
      ...currentPrize,
      prizeCode: value,
    }));

    clearCreateFieldError('prizeCode');
  };

  const handleCreatePrizeTierChange = (value: string | null) => {
    if (!value || !isKujiPrizeCode(value)) {
      return;
    }

    setNewPrize((currentPrize) => ({
      ...currentPrize,
      prizeTier: value,
      invalidPrizeTier: null,
    }));

    clearCreateFieldError('prizeTier');
  };

  const handleCreateFieldChange = (field: EditableKujiPrizeTextField, value: string) => {
    setNewPrize((currentPrize) => ({
      ...currentPrize,
      [field]: value,
    }));

    clearCreateFieldError(field);
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

    if (hasDuplicatePrizeCode(serverPrizes, normalizedNewPrize.prizeCode)) {
      setCreateErrors({
        prizeCode: getDuplicatePrizeCodeMessage(),
      });
      return;
    }

    setCreateErrors({});

    let imageUrl = normalizedNewPrize.imageUrl;

    if (createImageFile) {
      setIsUploadingCreateImage(true);

      try {
        const uploadResponse = await uploadAdminProductKujiPrizeImage(product.id, createImageFile);
        imageUrl = uploadResponse.data.data.imageUrl;
      } catch (error) {
        const message = getFriendlyErrorMessage(error, 'Failed to upload image.');

        setCreateErrors((currentErrors) => ({
          ...currentErrors,
          form: message,
        }));
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

  const handlePrizeDelete = (prizeId: string) => {
    setOptimisticPrizeIds(null);
    deletePrize({ productId: product.id, prizeId });
  };

  const handlePrizeEdit = (prize: IKujiPrize) => {
    setOptimisticPrizeIds(null);
    setEditingPrize(prize);
  };

  const handlePrizeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || isReorderingPrizes) {
      return;
    }

    const nextPrizes = moveSortableItems(sortedPrizes, String(active.id), String(over.id));

    if (nextPrizes === sortedPrizes) {
      return;
    }

    const updates = buildSortOrderUpdates(sortedPrizes, nextPrizes).map((update) => ({
      prizeId: update.id,
      sortOrder: update.sortOrder,
    }));

    if (updates.length === 0) {
      return;
    }

    prizeOrderRollbackRef.current = sortedPrizes.map((prize) => prize.id);
    setOptimisticPrizeIds(nextPrizes.map((prize) => prize.id));
    reorderPrizes({
      productId: product.id,
      updates,
    });
  };

  return (
    <>
      {toast ? <KujiPrizeToastBanner toast={toast} onDismiss={() => setToast(null)} /> : null}

      <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 pb-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Kuji Prizes</h2>
          <div className="flex items-center gap-2">
            {isReorderingPrizes ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                Saving order
              </span>
            ) : null}
            <Button
              type="button"
              disabled={isReorderingPrizes}
              onClick={() => {
                setOptimisticPrizeIds(null);
                void refetch();
              }}
              className="h-8 gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-primary/60"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Refresh Pool
            </Button>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {isPending ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading prizes...</div>
          ) : sortedPrizes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No prizes added to this pull list yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handlePrizeDragEnd}
              >
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground">
                      <th className="w-11 px-2 py-2">
                        <span className="sr-only">Reorder</span>
                      </th>
                      <th className="px-3 py-2 font-medium">Prize</th>
                      <th className="px-3 py-2 font-medium text-right">Sort</th>
                      <th className="px-3 py-2 font-medium text-right">Initial Qty</th>
                      <th className="px-3 py-2 font-medium text-right">Remaining</th>
                      <th className="px-3 py-2 font-medium text-right">Sold</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={sortedPrizes.map((prize) => prize.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-border/30">
                      {sortedPrizes.map((prize) => (
                        <SortablePrizeRow
                          key={prize.id}
                          prize={prize}
                          isDeleting={isDeleting}
                          isReordering={isReorderingPrizes}
                          onDelete={handlePrizeDelete}
                          onEdit={handlePrizeEdit}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted/30 p-4 border border-border/30">
          <div className='flex justify-between mb-8'>
            <h3 className="mb-3 text-md font-medium text-foreground">Add New Prize</h3>
            <Button
              type="submit"
              form="create-kuji-prize-form"
              disabled={isCreating || isUploadingCreateImage}
              className="h-8 rounded-md px-3 text-xs font-medium"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {isUploadingCreateImage ? 'Uploading...' : isCreating ? 'Adding...' : 'Add'}
            </Button>
          </div>
          <form id="create-kuji-prize-form" onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-start">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Prize Code</label>
              <Input
                required
                value={newPrize.prizeCode}
                onChange={(event) => handleCreatePrizeCodeChange(event.target.value)}
                onBlur={(event) => handleCreatePrizeCodeChange(event.target.value.trim().toUpperCase())}
                className={cn('h-8 text-sm uppercase', getFieldClasses(Boolean(createErrors.prizeCode)))}
                placeholder="A1"
              />
              <p className="mt-1 text-xs text-muted-foreground">Unique per product, e.g. A1, A2, B1, LO.</p>
              {createErrors.prizeCode ? <p className="mt-1 text-xs text-red-600">{createErrors.prizeCode}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Prize Tier</label>
              <Select
                value={newPrize.prizeTier}
                onValueChange={handleCreatePrizeTierChange}
                modal={false}
              >
                <SelectTrigger
                  className={cn('h-8 w-full text-sm', getFieldClasses(Boolean(createErrors.prizeTier)))}
                  aria-label="Prize Tier"
                >
                  <SelectValue className={cn(!newPrize.prizeTier && 'text-muted-foreground')}>
                    {newPrize.prizeTier || 'Select tier'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {KUJI_PRIZE_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {getAdminPrizeTierLabel(tier)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">Customer-facing group, e.g. Prize A or Last One.</p>
              {createErrors.prizeTier ? <p className="mt-1 text-xs text-red-600">{createErrors.prizeTier}</p> : null}
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Prize Name</label>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Initial Qty</label>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Remaining Qty</label>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort Order</label>
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
              <ErrorAlert message={createErrors.form} />
            </div>
          </form>
        </div>
      </div>

      <EditKujiPrizeModal
        open={editingPrize !== null}
        prize={editingPrize}
        prizes={serverPrizes}
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
