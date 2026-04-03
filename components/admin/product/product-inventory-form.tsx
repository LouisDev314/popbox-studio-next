'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Save } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { IAdminProductEditor } from '@/interfaces/product';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { mergeAdminProductIntoEditor, parseWholeNumber } from '@/utils/admin';

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

function getInventoryErrorMessage(error: AxiosError<IBaseApiResponse>): string {
  return error.response?.data?.message?.trim() || 'Failed to update inventory.';
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
        message: getInventoryErrorMessage(error),
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Inventory Tracking</h2>
        <Button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? 'Saving...' : 'Save Inventory'}
        </Button>
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            feedback.type === 'success'
              ? 'border-primary/20 bg-primary/10 text-foreground'
              : 'border-primary/20 bg-accent text-foreground'
          }`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
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
          <p className="mt-1 text-xs text-muted-foreground">Total physical items available.</p>
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
          <p className="mt-1 text-xs text-muted-foreground">Threshold for low stock warnings.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Reserved <span className="text-[10px] uppercase text-muted-foreground/60">(Read-only)</span>
          </label>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
            {product.inventory?.reserved ?? 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Items currently in active carts.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border/20 pt-4">
        <span className="text-sm font-medium text-foreground">Available to sell</span>
        <span className="tabular-nums text-lg font-bold text-primary">{product.inventory?.available ?? 0}</span>
      </div>
    </form>
  );
}
