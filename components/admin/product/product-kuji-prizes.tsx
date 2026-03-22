'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RotateCw, Trash, X } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IAdminProduct, IKujiPrize } from '@/interfaces/product';

import { EditKujiPrizeModal } from './edit-kuji-prize-modal';

type KujiPrizeToast = {
  id: number;
  type: 'success' | 'error';
  message: string;
};

export function ProductKujiPrizes({ product }: { product: IAdminProduct }) {
  const queryClient = useQueryClient();
  const toastTimeoutRef = useRef<number | null>(null);
  const [editingPrize, setEditingPrize] = useState<IKujiPrize | null>(null);
  const [toast, setToast] = useState<KujiPrizeToast | null>(null);
  const [newPrize, setNewPrize] = useState({
    prizeCode: '',
    name: '',
    initialQuantity: '1',
  });

  const { data: prizesRes, isPending, refetch } = useCustomizeQuery({
    queryKey: ['admin', 'prizes', product.id],
    queryFn: () => QueryConfigs.fetchAdminProductKujiPrizes(product.id),
  });

  const prizes = prizesRes?.data?.data || [];
  const sortedPrizes = [...prizes].sort((a, b) => a.sortOrder - b.sortOrder);

  const { mutation: createPrize, isPending: isCreating } = useCustomizeMutation({
    mutationFn: MutationConfigs.createAdminProductKujiPrize,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', product.id] });
      setNewPrize({ prizeCode: '', name: '', initialQuantity: '1' });
    },
  });

  const { mutation: deletePrize, isPending: isDeleting } = useCustomizeMutation({
    mutationFn: MutationConfigs.deleteAdminProductKujiPrize,
    onSuccess: () => {
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPrize({
      productId: product.id,
      data: {
        prizeCode: newPrize.prizeCode.toUpperCase(),
        name: newPrize.name,
        initialQuantity: Math.max(1, parseInt(newPrize.initialQuantity || '1', 10)),
      },
    });
  };

  return (
    <>
      {toast ? (
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
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-md p-1 transition-colors hover:bg-black/5"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#D5C1C9]/20 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Kuji Prizes</h2>
            <p className="mt-1 text-xs text-[#514349]">Manage the prize pool for this Kuji product.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-[#191C1E] transition-colors hover:bg-primary/60"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh Pool
          </button>
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
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-4 items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#514349]">Rank (e.g. A)</label>
              <Input required maxLength={10} value={newPrize.prizeCode} onChange={e => setNewPrize(p => ({ ...p, prizeCode: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#514349]">Prize Name</label>
              <Input required value={newPrize.name} onChange={e => setNewPrize(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Grand Figure" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-[#514349]">Qty</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={newPrize.initialQuantity}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (!/^\d*$/.test(value)) return;

                    setNewPrize((p) => ({
                      ...p,
                      initialQuantity: value,
                    }));
                  }}
                  className="h-8 text-sm"
                  placeholder="0"
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex h-8 items-center justify-center rounded-md bg-[#191C1E] px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#191C1E]/90 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </button>
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
