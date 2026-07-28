'use client';

import { useId, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Save, Star, Trash2 } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import type {
  IAdminProductEditor,
  IAdminProductVariant,
} from '@/interfaces/product';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import {
  parsePriceToCents,
  parseWholeNumber,
  toNullableText,
} from '@/utils/admin';
import { getProductVariantErrorMessage } from '@/utils/api-errors';

type VariantDraft = {
  name: string;
  sku: string;
  price: string;
  onHand: string;
  lowStockThreshold: string;
  isActive: boolean;
};

function createDraft(variant?: IAdminProductVariant): VariantDraft {
  return {
    name: variant?.name ?? '',
    sku: variant?.sku ?? '',
    price: variant ? (variant.priceCents / 100).toFixed(2) : '',
    onHand: String(variant?.inventory.onHand ?? 0),
    lowStockThreshold: String(variant?.inventory.lowStockThreshold ?? 0),
    isActive: variant?.isActive ?? true,
  };
}

function normalizedText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

async function invalidateVariantQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  ]);
}

function VariantEditor(props: {
  index: number;
  productId: string;
  total: number;
  variant: IAdminProductVariant;
  siblingVariants: IAdminProductVariant[];
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => createDraft(props.variant));
  const [detailsFeedback, setDetailsFeedback] = useState<string | null>(null);
  const [inventoryFeedback, setInventoryFeedback] = useState<string | null>(null);
  const detailsFeedbackId = useId();
  const inventoryFeedbackId = useId();

  const detailsMutation = useCustomizeMutation<
    IAdminProductVariant,
    Parameters<typeof MutationConfigs.updateAdminProductVariant>[0]
  >({
    mutationFn: MutationConfigs.updateAdminProductVariant,
    onSuccess: () => {
      setDetailsFeedback(null);
      void invalidateVariantQueries(queryClient, props.productId);
    },
    onError: (error) => {
      setDetailsFeedback(getProductVariantErrorMessage(
        error,
        'Unable to save this variant. Please try again.',
      ));
    },
  });

  const inventoryMutation = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProductVariantInventory,
    onSuccess: () => {
      setInventoryFeedback(null);
      void invalidateVariantQueries(queryClient, props.productId);
    },
    onError: (error) => {
      setInventoryFeedback(getProductVariantErrorMessage(
        error,
        'Unable to update variant inventory. Please try again.',
      ));
    },
  });

  const defaultMutation = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProductVariant,
    onSuccess: () => {
      setDetailsFeedback(null);
      void invalidateVariantQueries(queryClient, props.productId);
    },
    onError: (error) => {
      setDetailsFeedback(getProductVariantErrorMessage(
        error,
        'Unable to change the default variant.',
      ));
    },
  });

  const deleteMutation = useCustomizeMutation({
    mutationFn: MutationConfigs.deleteAdminProductVariant,
    onSuccess: () => {
      void invalidateVariantQueries(queryClient, props.productId);
    },
    onError: (error) => {
      setDetailsFeedback(getProductVariantErrorMessage(
        error,
        'Unable to delete this variant.',
      ));
    },
  });

  const duplicateName = props.siblingVariants.some(
    (variant) => variant.id !== props.variant.id
      && normalizedText(variant.name) === normalizedText(draft.name),
  );
  const duplicateSku = Boolean(draft.sku.trim()) && props.siblingVariants.some(
    (variant) => variant.id !== props.variant.id
      && variant.sku
      && normalizedText(variant.sku) === normalizedText(draft.sku),
  );
  const detailsPending = detailsMutation.isPending
    || defaultMutation.isPending
    || deleteMutation.isPending;

  const saveDetails = () => {
    setDetailsFeedback(null);

    if (!draft.name.trim()) {
      setDetailsFeedback('Variant name is required.');
      return;
    }

    if (duplicateName) {
      setDetailsFeedback('Variant names must be unique for this product.');
      return;
    }

    if (duplicateSku) {
      setDetailsFeedback('Variant SKUs must be unique for this product.');
      return;
    }

    detailsMutation.mutation({
      productId: props.productId,
      variantId: props.variant.id,
      data: {
        name: draft.name.trim(),
        sku: toNullableText(draft.sku),
        priceCents: parsePriceToCents(draft.price),
        isActive: draft.isActive,
      },
    });
  };

  const saveInventory = () => {
    setInventoryFeedback(null);
    inventoryMutation.mutation({
      productId: props.productId,
      variantId: props.variant.id,
      data: {
        onHand: parseWholeNumber(draft.onHand),
        lowStockThreshold: parseWholeNumber(draft.lowStockThreshold),
      },
    });
  };

  const deleteVariant = () => {
    if (
      props.variant.isDefault
      || props.total === 1
      || !window.confirm(`Delete variant “${props.variant.name}”? This cannot be undone.`)
    ) {
      return;
    }

    deleteMutation.mutation({
      productId: props.productId,
      variantId: props.variant.id,
    });
  };

  return (
    <article className="rounded-xl border border-border/50 bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{props.variant.name}</h3>
          {props.variant.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              <Star className="size-3" aria-hidden="true" />
              Default
            </span>
          ) : null}
          {!props.variant.isActive ? (
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
              Inactive
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move ${props.variant.name} up`}
            disabled={props.index === 0 || detailsPending}
            onClick={() => props.onMove(props.index, -1)}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move ${props.variant.name} down`}
            disabled={props.index === props.total - 1 || detailsPending}
            onClick={() => props.onMove(props.index, 1)}
          >
            <ArrowDown className="size-4" />
          </Button>
        </div>
      </div>

      <ErrorAlert
        id={detailsFeedbackId}
        className="mt-4"
        message={detailsFeedback}
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          <span>Name</span>
          <Input
            value={draft.name}
            aria-invalid={duplicateName}
            aria-describedby={detailsFeedback ? detailsFeedbackId : undefined}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>SKU</span>
          <Input
            value={draft.sku}
            aria-invalid={duplicateSku}
            aria-describedby={detailsFeedback ? detailsFeedbackId : undefined}
            onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>Price (CAD)</span>
          <Input
            value={draft.price}
            inputMode="decimal"
            aria-describedby={detailsFeedback ? detailsFeedbackId : undefined}
            onChange={(event) => {
              if (/^\d*\.?\d*$/.test(event.target.value)) {
                setDraft((current) => ({ ...current, price: event.target.value }));
              }
            }}
          />
        </label>
        <label className="flex min-h-10 items-center gap-3 self-end rounded-lg border border-border/60 px-3 py-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.isActive}
            disabled={props.variant.isDefault}
            aria-describedby={detailsFeedback ? detailsFeedbackId : undefined}
            onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={detailsPending} onClick={saveDetails}>
          <Save className="mr-1.5 size-4" />
          {detailsMutation.isPending ? 'Saving…' : 'Save details'}
        </Button>
        {!props.variant.isDefault ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={detailsPending}
            onClick={() => defaultMutation.mutation({
              productId: props.productId,
              variantId: props.variant.id,
              data: { isDefault: true },
            })}
          >
            <Star className="mr-1.5 size-4" />
            Make default
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={detailsPending || props.variant.isDefault || props.total === 1}
          onClick={deleteVariant}
        >
          <Trash2 className="mr-1.5 size-4" />
          Delete
        </Button>
      </div>

      <div className="mt-5 border-t border-border/40 pt-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            <span>On hand</span>
            <NumericInput
              value={draft.onHand}
              aria-describedby={inventoryFeedback ? inventoryFeedbackId : undefined}
              onValueChange={(value) => setDraft((current) => ({ ...current, onHand: value }))}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>Low-stock threshold</span>
            <NumericInput
              value={draft.lowStockThreshold}
              aria-describedby={inventoryFeedback ? inventoryFeedbackId : undefined}
              onValueChange={(value) => setDraft((current) => ({ ...current, lowStockThreshold: value }))}
            />
          </label>
          <div className="space-y-1.5 text-sm">
            <span className="font-medium">Reserved</span>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3">
              {props.variant.inventory.reserved}
            </div>
          </div>
          <div className="space-y-1.5 text-sm">
            <span className="font-medium">Available</span>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3">
              {props.variant.inventory.available}
            </div>
          </div>
        </div>
        <ErrorAlert
          id={inventoryFeedbackId}
          className="mt-4"
          message={inventoryFeedback}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-4"
          disabled={inventoryMutation.isPending}
          onClick={saveInventory}
        >
          <Save className="mr-1.5 size-4" />
          {inventoryMutation.isPending ? 'Saving…' : 'Save inventory'}
        </Button>
      </div>
    </article>
  );
}

export function ProductVariantsForm({ product }: { product: IAdminProductEditor }) {
  const queryClient = useQueryClient();
  const variants = useMemo(
    () => [...(product.variants ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
    ),
    [product.variants],
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDraft, setNewDraft] = useState<VariantDraft>(() => createDraft());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const feedbackId = useId();
  const addVariantFormId = useId();

  const createMutation = useCustomizeMutation({
    mutationFn: MutationConfigs.createAdminProductVariant,
    onSuccess: () => {
      setFeedback(null);
      setNewDraft(createDraft());
      setShowAddForm(false);
      void invalidateVariantQueries(queryClient, product.id);
    },
    onError: (error) => {
      setFeedback(getProductVariantErrorMessage(
        error,
        'Unable to create this variant. Please try again.',
      ));
    },
  });

  const reorderMutation = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProductVariant,
  });

  const addVariant = () => {
    setFeedback(null);
    const name = newDraft.name.trim();
    const sku = toNullableText(newDraft.sku);

    if (!name) {
      setFeedback('Variant name is required.');
      return;
    }

    if (variants.some((variant) => normalizedText(variant.name) === normalizedText(name))) {
      setFeedback('Variant names must be unique for this product.');
      return;
    }

    if (
      sku
      && variants.some((variant) => variant.sku && normalizedText(variant.sku) === normalizedText(sku))
    ) {
      setFeedback('Variant SKUs must be unique for this product.');
      return;
    }

    createMutation.mutation({
      productId: product.id,
      data: {
        name,
        sku,
        priceCents: parsePriceToCents(newDraft.price),
        isActive: newDraft.isActive,
        sortOrder: variants.length,
        inventory: {
          onHand: parseWholeNumber(newDraft.onHand),
          lowStockThreshold: parseWholeNumber(newDraft.lowStockThreshold),
        },
      },
    });
  };

  const moveVariant = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    const current = variants[index];
    const target = variants[targetIndex];

    if (!current || !target || isReordering) {
      return;
    }

    setFeedback(null);
    setIsReordering(true);

    try {
      await reorderMutation.mutationAsync({
        productId: product.id,
        variantId: current.id,
        data: { sortOrder: targetIndex },
      });
      await reorderMutation.mutationAsync({
        productId: product.id,
        variantId: target.id,
        data: { sortOrder: index },
      });
      await invalidateVariantQueries(queryClient, product.id);
    } catch (error) {
      setFeedback(getProductVariantErrorMessage(
        error,
        'Variant order could not be fully saved. Refresh before retrying.',
      ));
      await invalidateVariantQueries(queryClient, product.id);
    } finally {
      setIsReordering(false);
    }
  };

  if (variants.length === 0) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="font-semibold text-destructive">Variant data unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This standard product has no variants. Refresh the page before making catalog changes.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] })}
        >
          Refresh variants
        </Button>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border/30 bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Standard product variants
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Price, SKU, availability, and inventory are managed per variant.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={showAddForm || isReordering}
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="mr-1.5 size-4" />
          Add variant
        </Button>
      </div>

      <ErrorAlert id={feedbackId} className="mt-4" message={feedback} />

      {showAddForm ? (
        <section
          aria-labelledby={`${addVariantFormId}-title`}
          className="mt-5 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4"
        >
          <h3 id={`${addVariantFormId}-title`} className="font-semibold">
            Unsaved variant
          </h3>
          <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${addVariantFormId}-name`}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Variant Name
              </label>
              <Input
                id={`${addVariantFormId}-name`}
                aria-describedby={feedback ? feedbackId : undefined}
                value={newDraft.name}
                onChange={(event) => setNewDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div>
              <label
                htmlFor={`${addVariantFormId}-sku`}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                SKU (Optional)
              </label>
              <Input
                id={`${addVariantFormId}-sku`}
                aria-describedby={feedback ? feedbackId : undefined}
                value={newDraft.sku}
                onChange={(event) => setNewDraft((current) => ({ ...current, sku: event.target.value }))}
              />
            </div>

            <div>
              <label
                htmlFor={`${addVariantFormId}-price`}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Price (CAD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground" aria-hidden="true">
                  $
                </span>
                <Input
                  id={`${addVariantFormId}-price`}
                  aria-describedby={`${addVariantFormId}-price-help${feedback ? ` ${feedbackId}` : ''}`}
                  className="pl-7"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={newDraft.price}
                  onChange={(event) => {
                    if (/^\d*\.?\d*$/.test(event.target.value)) {
                      setNewDraft((current) => ({ ...current, price: event.target.value }));
                    }
                  }}
                />
              </div>
              <p
                id={`${addVariantFormId}-price-help`}
                className="mt-1.5 text-xs text-muted-foreground"
              >
                Customer purchase price.
              </p>
            </div>

            <div>
              <label
                htmlFor={`${addVariantFormId}-on-hand`}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                On Hand Inventory
              </label>
              <NumericInput
                id={`${addVariantFormId}-on-hand`}
                aria-describedby={`${addVariantFormId}-on-hand-help${feedback ? ` ${feedbackId}` : ''}`}
                placeholder="0"
                value={newDraft.onHand}
                onValueChange={(value) => setNewDraft((current) => ({ ...current, onHand: value }))}
              />
              <p
                id={`${addVariantFormId}-on-hand-help`}
                className="mt-1.5 text-xs text-muted-foreground"
              >
                Physical units currently in stock.
              </p>
            </div>

            <div>
              <label
                htmlFor={`${addVariantFormId}-low-stock-threshold`}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Low Stock Threshold
              </label>
              <NumericInput
                id={`${addVariantFormId}-low-stock-threshold`}
                aria-describedby={`${addVariantFormId}-low-stock-threshold-help${feedback ? ` ${feedbackId}` : ''}`}
                placeholder="0"
                value={newDraft.lowStockThreshold}
                onValueChange={(value) => setNewDraft((current) => ({ ...current, lowStockThreshold: value }))}
              />
              <p
                id={`${addVariantFormId}-low-stock-threshold-help`}
                className="mt-1.5 text-xs text-muted-foreground"
              >
                Warning shown when inventory falls below this value.
              </p>
            </div>

            <label className="flex min-h-10 items-center gap-3 self-start rounded-lg border border-border/60 px-3 py-2 text-sm font-medium sm:mt-7">
              <input
                type="checkbox"
                checked={newDraft.isActive}
                aria-describedby={feedback ? feedbackId : undefined}
                onChange={(event) => setNewDraft((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={createMutation.isPending} onClick={addVariant}>
              {createMutation.isPending ? 'Adding…' : 'Add variant'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={() => {
                setNewDraft(createDraft());
                setShowAddForm(false);
                setFeedback(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <div className="mt-5 space-y-4" aria-busy={isReordering}>
        {variants.map((variant, index) => (
          <VariantEditor
            key={variant.id}
            index={index}
            productId={product.id}
            total={variants.length}
            variant={variant}
            siblingVariants={variants}
            onMove={moveVariant}
          />
        ))}
      </div>
    </section>
  );
}
