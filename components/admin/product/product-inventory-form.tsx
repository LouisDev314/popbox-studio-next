'use client';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IAdminProductEditor } from '@/interfaces/product';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { parseWholeNumber } from '@/utils/admin';

type ProductInventoryFormData = {
  onHand: string;
  lowStockThreshold: string;
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

  useEffect(() => {
    setFormData(createInitialFormData(product));
  }, [product.id, product.inventory?.lowStockThreshold, product.inventory?.onHand, product.updatedAt]);

  const { mutation: updateInventory, isPending } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProductInventory,
    onSuccess: (response) => {
      const nextOnHand = parseWholeNumber(formData.onHand);
      const nextLowStockThreshold = parseWholeNumber(formData.lowStockThreshold);

      onProductChange((currentProduct) => {
        if (!currentProduct) {
          return currentProduct;
        }

        const reserved = currentProduct.inventory?.reserved ?? 0;

        return {
          ...currentProduct,
          ...response.data.data,
          inventory: {
            onHand: nextOnHand,
            reserved,
            available: Math.max(nextOnHand - reserved, 0),
            lowStockThreshold: nextLowStockThreshold,
          },
        };
      });

      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (e) => {
      alert(`Failed to update product ${e}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateInventory({
      productId: product.id,
      data: {
        onHand: parseWholeNumber(formData.onHand),
        lowStockThreshold: parseWholeNumber(formData.lowStockThreshold),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#191C1E]">Inventory Tracking</h2>
        <Button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? 'Saving...' : 'Save Inventory'}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">On Hand</label>
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
          <p className="mt-1 text-xs text-[#514349]">Total physical items available.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Low Stock Alerts</label>
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
          <p className="mt-1 text-xs text-[#514349]">Threshold for low stock warnings.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">
            Reserved <span className="text-[10px] uppercase text-[#514349]/60">(Read-only)</span>
          </label>
          <div className="flex h-10 w-full rounded-md border border-input bg-[#F2F4F6] px-3 py-2 text-sm text-[#514349]">
            {product.inventory?.reserved ?? 0}
          </div>
          <p className="mt-1 text-xs text-[#514349]">Items currently in active carts.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-[#D5C1C9]/20 pt-4">
        <span className="text-sm font-medium text-[#191C1E]">Available to sell</span>
        <span className="tabular-nums text-lg font-bold text-primary">{product.inventory?.available ?? 0}</span>
      </div>
    </form>
  );
}
