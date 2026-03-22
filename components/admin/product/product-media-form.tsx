'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { Trash, ArrowUp, ArrowDown } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IAdminProductEditor } from '@/interfaces/product';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import getEnvConfig from '@/configs/env';
import { mergeAdminImages } from '@/utils/admin';

interface IProductMediaFormProps {
  product: IAdminProductEditor;
  onProductChange: Dispatch<SetStateAction<IAdminProductEditor | null>>;
}

export function ProductMediaForm({ product, onProductChange }: IProductMediaFormProps) {
  const queryClient = useQueryClient();
  const [uploadingCount, setUploadingCount] = useState(0);

  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const isUploading = uploadingCount > 0;

  const { mutation: uploadImage } = useCustomizeMutation({
    mutationFn: MutationConfigs.uploadAdminProductImage,
    onSuccess: (response) => {
      const uploadedImages = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];

      onProductChange((currentProduct) => {
        if (!currentProduct) {
          return currentProduct;
        }

        return {
          ...currentProduct,
          images: mergeAdminImages(currentProduct.images, [
            ...currentProduct.images,
            ...uploadedImages,
          ]),
        };
      });

      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
    },
    onSettled: () => {
      setUploadingCount((currentCount) => Math.max(currentCount - 1, 0));
    },
  });

  const { mutation: deleteImage, isPending: isDeleting } = useCustomizeMutation({
    mutationFn: MutationConfigs.deleteAdminProductImage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
    },
  });

  const { mutation: reorderImages, isPending: isReordering } = useCustomizeMutation({
    mutationFn: MutationConfigs.reorderAdminProductImages,
    onSuccess: (response) => {
      onProductChange((currentProduct) => {
        if (!currentProduct) {
          return currentProduct;
        }

        return {
          ...currentProduct,
          images: mergeAdminImages(currentProduct.images, response.data.data),
        };
      });

      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
    },
  });

  const handleFileChange = (files: File[]) => {
    if (!files.length) return;
    setUploadingCount((currentCount) => currentCount + files.length);

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
    const optimisticImages = newImages.map((image, imageIndex) => ({
      ...image,
      sortOrder: imageIndex,
    }));

    onProductChange((currentProduct) => {
      if (!currentProduct) {
        return currentProduct;
      }

      return {
        ...currentProduct,
        images: optimisticImages,
      };
    });

    const imageIds = newImages.map((img) => img.id);
    reorderImages({ productId: product.id, imageIds });
  };

  const handleDelete = (imageId: string) => {
    onProductChange((currentProduct) => {
      if (!currentProduct) {
        return currentProduct;
      }

      return {
        ...currentProduct,
        images: currentProduct.images.filter((image) => image.id !== imageId),
      };
    });

    deleteImage({ productId: product.id, imageId });
  };

  const getImagePreviewSrc = (url: string | null, storageKey: string | null) => {
    if (url) {
      return url;
    }

    if (!storageKey) {
      return null;
    }

    return `${getEnvConfig().supabaseUrl}/storage/v1/object/public/${storageKey}`;
  };

  const getImageLabel = (storageKey: string | null, url: string | null, index: number) => {
    const candidate = storageKey ?? url;

    if (!candidate) {
      return `Image ${index + 1}`;
    }

    const normalizedCandidate = candidate.split('?')[0]?.split('#')[0] ?? candidate;
    const lastSegment = normalizedCandidate.split('/').filter(Boolean).pop();

    return lastSegment || `Image ${index + 1}`;
  };

  return (
    <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-4">
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-[#191C1E]">Media & Images</h2>
          <p className="text-sm text-[#514349]">Upload multiple images. New uploads appear here immediately.</p>
        </div>
        <div className="relative border border-[#D5C1C9]/50 rounded-lg overflow-hidden transition-colors hover:border-primary/50">
          {isUploading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
              <span className="text-sm font-medium text-primary shadow-sm bg-white px-3 py-1.5 rounded-full border border-primary/20">Uploading...</span>
            </div>
          )}
          <FileUpload onChange={handleFileChange} multiple />
        </div>
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D5C1C9] bg-[#FBFAFB] p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-[#191C1E]">No images uploaded yet.</p>
          <p className="mt-1 text-sm text-[#514349]">Upload product photography, packaging shots, or promo art.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {images.map((img, idx) => {
            const imgSrc = getImagePreviewSrc(img.url, img.storageKey);
            const imageLabel = getImageLabel(img.storageKey, img.url, idx);

            return (
              <div key={img.id} className="flex items-center gap-4 rounded-xl border border-[#D5C1C9]/50 bg-[#FBFAFB] p-3 transition-colors hover:bg-white">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-[#E6E8EA] shadow-sm">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={img.altText || 'Product image'}
                      fill
                      sizes="72px"
                      className="object-cover"
                      unoptimized={imgSrc.includes('supabase')}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-medium uppercase tracking-wider text-[#514349]/60">
                      No preview
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#191C1E]">{imageLabel}</p>
                  {img.altText && <p className="mt-0.5 truncate text-xs text-[#514349]">{img.altText}</p>}
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-[#514349]/60">Position {idx + 1}</p>
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
                    onClick={() => handleDelete(img.id)}
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
