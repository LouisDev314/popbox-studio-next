'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IAdminProduct } from '@/interfaces/product';
import { NumericInput } from '@/components/ui/numeric-input';

type ProductInventoryFormData = {
  onHand: string;
  lowStockThreshold: string;
};

function createInitialFormData(product: IAdminProduct): ProductInventoryFormData {
  return {
    onHand: String(product.inventory?.onHand ?? 0),
    lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 0),
  };
}

export function ProductInventoryForm({ product }: { product: IAdminProduct }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ProductInventoryFormData>(() => createInitialFormData(product));

  const { mutation: updateInventory, isPending } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProductInventory,
    onSuccess: () => {
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
        onHand: parseInt(formData.onHand || '0', 10),
        lowStockThreshold: parseInt(formData.lowStockThreshold || '0', 10),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#191C1E]">Inventory Tracking</h2>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-[#191C1E] transition-colors hover:bg-primary/60 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? 'Saving...' : 'Save Inventory'}
        </button>
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
