'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { Trash, ArrowUp, ArrowDown } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IAdminProduct } from '@/interfaces/product';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import getEnvConfig from '@/configs/env';

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

  const handleFileChange = (files: File[]) => {
    if (!files.length) return;
    setIsUploading(true);

    files.forEach((file) => {
      const formData = new FormData();
      formData.append('file', file);
      uploadImage({ productId: product.id, formData });
    });
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
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#191C1E] uppercase tracking-wider mb-4">Media & Images</h2>
        <div className="relative border border-[#D5C1C9]/50 rounded-lg overflow-hidden transition-colors hover:border-primary/50">
          {isUploading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
              <span className="text-sm font-medium text-primary shadow-sm bg-white px-3 py-1.5 rounded-full border border-primary/20">Uploading...</span>
            </div>
          )}
          <FileUpload onChange={handleFileChange} />
        </div>
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D5C1C9] bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#514349]">No images uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img, idx) => {
            let imgSrc = img.url;
            if (!imgSrc || !imgSrc.startsWith('http')) {
              imgSrc = `${getEnvConfig().supabaseUrl}/storage/v1/object/public/${img.storageKey}`;
            }

            return (
              <div key={img.id} className="flex items-center gap-4 rounded-lg border border-[#D5C1C9]/50 p-3 transition-colors hover:bg-slate-50">
                <Image
                  src={imgSrc}
                  alt={img.altText || 'Product image'}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded object-cover shadow-sm bg-[#E6E8EA] shrink-0"
                  unoptimized={imgSrc.includes('supabase')}
                />
                
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[#191C1E]">{img.storageKey.split('/').pop() || 'Image'}</p>
                  {img.altText && <p className="truncate text-xs text-[#514349] mt-0.5">{img.altText}</p>}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Move Up"
                    disabled={idx === 0 || isReordering}
                    onClick={() => handleMove(idx, 'up')}
                    className="h-8 w-8 text-[#514349]"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Move Down"
                    disabled={idx === images.length - 1 || isReordering}
                    onClick={() => handleMove(idx, 'down')}
                    className="h-8 w-8 text-[#514349]"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <div className="mx-1 h-5 w-px bg-[#D5C1C9]/50" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    disabled={isDeleting}
                    onClick={() => deleteImage({ productId: product.id, imageId: img.id })}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
