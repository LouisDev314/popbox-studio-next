'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Trash, ArrowUp, ArrowDown } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IAdminProduct } from '@/interfaces/product';

export function ProductMediaForm({ product }: { product: IAdminProduct }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const images = [...(product.images || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const { mutation: uploadImage } = useCustomizeMutation({
    mutationFn: MutationConfigs.uploadAdminProductImage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onSettled: () => setIsUploading(false),
  });

  const { mutation: deleteImage, isPending: isDeleting } = useCustomizeMutation({
    mutationFn: MutationConfigs.deleteAdminProductImage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const { mutation: reorderImages, isPending: isReordering } = useCustomizeMutation({
    mutationFn: MutationConfigs.reorderAdminProductImages,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    uploadImage({ productId: product.id, formData });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];

    const imageIds = newImages.map((img) => img.id);
    reorderImages({ productId: product.id, imageIds });
  };

  return (
    <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Media & Images</h2>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <button
            type="button"
            disabled={isUploading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E6E8EA] px-3 text-sm font-medium text-[#191C1E] transition-colors hover:bg-[#D5C1C9] disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D5C1C9] bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#514349]">No images uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div key={img.id} className="flex items-center gap-4 rounded-lg border border-[#D5C1C9]/50 p-3 transition-colors hover:bg-slate-50">
              <img src={img.url} alt={img.altText || ''} className="h-16 w-16 rounded object-cover shadow-sm bg-[#E6E8EA] shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-[#191C1E]">{img.storageKey.split('/').pop() || 'Image'}</p>
                {img.altText && <p className="truncate text-xs text-[#514349] mt-0.5">{img.altText}</p>}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Move Up"
                  disabled={idx === 0 || isReordering}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-1.5 rounded text-[#514349] hover:bg-white hover:text-[#191C1E] disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Move Down"
                  disabled={idx === images.length - 1 || isReordering}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-1.5 rounded text-[#514349] hover:bg-white hover:text-[#191C1E] disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <div className="mx-1 h-5 w-px bg-[#D5C1C9]/50" />
                <button
                  type="button"
                  title="Delete"
                  disabled={isDeleting}
                  onClick={() => deleteImage({ productId: product.id, imageId: img.id })}
                  className="p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
