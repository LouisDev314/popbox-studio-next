'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IAdminProductEditor } from '@/interfaces/product';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { NumericInput } from '@/components/ui/numeric-input';
import { mergeAdminProductIntoEditor, parseWholeNumber } from '@/utils/admin';
import { getFriendlyErrorMessage } from '@/utils/api-errors';

type ProductInventoryFormData = {
  onHand: string;
  lowStockThreshold: string;
};

type ProductInventoryFeedback = {
  message: string;
  type: 'error' | 'success';
};

function createInitialFormData(product: IAdminProductEditor): ProductInventoryFormData {
  return {
    onHand: String(product.inventory?.onHand ?? 0),
    lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 0),
  };
}

interface IProductInventoryFormProps {
  product: IAdminProductEditor;
  onProductChange: Dispatch<SetStateAction<IAdminProductEditor | null>>;
}

export function ProductInventoryForm({ product, onProductChange }: IProductInventoryFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ProductInventoryFormData>(() => createInitialFormData(product));
  const [feedback, setFeedback] = useState<ProductInventoryFeedback | null>(null);

  const { mutation: updateInventory, isPending } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProductInventory,
    onSuccess: (response) => {
      const nextOnHand = parseWholeNumber(formData.onHand);
      const nextLowStockThreshold = parseWholeNumber(formData.lowStockThreshold);
      const updatedProduct = response.data.data;

      onProductChange((currentProduct) => {
        if (!currentProduct) {
          return currentProduct;
        }

        const reserved = currentProduct.inventory?.reserved ?? 0;

        return {
          ...mergeAdminProductIntoEditor(currentProduct, updatedProduct),
          inventory: {
            onHand: nextOnHand,
            reserved,
            available: Math.max(nextOnHand - reserved, 0),
            lowStockThreshold: nextLowStockThreshold,
          },
        };
      });

      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
      setFeedback({
        message: response.data.message?.trim() || 'Inventory updated.',
        type: 'success',
      });
    },
    onError: (error) => {
      setFeedback({
        message: getFriendlyErrorMessage(error, 'Unable to update inventory. Please try again.'),
        type: 'error',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    updateInventory({
      productId: product.id,
      data: {
        onHand: parseWholeNumber(formData.onHand),
        lowStockThreshold: parseWholeNumber(formData.lowStockThreshold),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Inventory Tracking</h2>
        <Button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors sm:w-auto"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? 'Saving...' : 'Save Inventory'}
        </Button>
      </div>

      {feedback?.type === 'error' ? (
        <ErrorAlert className="mb-4" message={feedback.message} />
      ) : feedback ? (
        <div
          className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">On Hand</label>
          <NumericInput
            required
            value={formData.onHand}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                onHand: value,
              }))
            }
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Low Stock Alerts</label>
          <NumericInput
            required
            value={formData.lowStockThreshold}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                lowStockThreshold: value,
              }))
            }
            placeholder="0"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Reserved <span className="text-[10px] uppercase text-muted-foreground/60">(Read-only)</span>
          </label>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
            {product.inventory?.reserved ?? 0}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-border/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-foreground">Available to sell</span>
        <span className="tabular-nums text-lg font-bold text-primary">{product.inventory?.available ?? 0}</span>
      </div>
    </form>
  );
}
