'use client';

import { Dispatch, SetStateAction, useRef, useState } from 'react';
import Image from 'next/image';
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
import { LoaderCircle, Trash } from 'lucide-react';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { IAdminProductEditor, IAdminProductImage } from '@/interfaces/product';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { mergeAdminImages, resolveAdminImageSrc } from '@/utils/admin';
import { cn } from '@/lib/utils';

import { buildSortOrderUpdates, moveSortableItems } from './reorder-utils';
import { SortableHandle, useAdminSortable } from './sortable-admin-item';

interface IProductMediaFormProps {
  product: IAdminProductEditor;
  onProductChange: Dispatch<SetStateAction<IAdminProductEditor | null>>;
}

interface ISortableProductImageCardProps {
  image: IAdminProductImage;
  isDeleting: boolean;
  isReordering: boolean;
  onDelete: (imageId: string) => void;
  previewSrc: string | null;
  label: string;
}

function SortableProductImageCard({
  image,
  isDeleting,
  isReordering,
  onDelete,
  previewSrc,
  label,
}: ISortableProductImageCardProps) {
  const isInteractionDisabled = isDeleting || isReordering;
  const { handleProps, isDragging, setNodeRef, style } = useAdminSortable(
    image.id,
    isInteractionDisabled,
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-4 rounded-xl border border-border/50 bg-background p-3 transition-[background-color,box-shadow,border-color] hover:border-primary/20 hover:bg-card',
        isDragging && 'border-primary/30 bg-card shadow-[0_12px_32px_rgba(25,28,30,0.14)]',
      )}
    >
      <SortableHandle
        label={`Reorder ${label}`}
        disabled={isInteractionDisabled}
        handleProps={handleProps}
      />

      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm">
        {previewSrc ? (
          <Image
            src={previewSrc}
            alt={image.altText || 'Product image'}
            fill
            sizes="72px"
            className="object-cover"
            unoptimized={previewSrc.includes('supabase')}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            No preview
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {image.altText ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{image.altText}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        {isReordering ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            Saving
          </span>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Delete"
          disabled={isDeleting || isReordering}
          onClick={() => onDelete(image.id)}
          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ProductMediaForm({ product, onProductChange }: IProductMediaFormProps) {
  const queryClient = useQueryClient();
  const [uploadingCount, setUploadingCount] = useState(0);
  const reorderRollbackRef = useRef<IAdminProductImage[] | null>(null);

  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const isUploading = uploadingCount > 0;
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
    onError: () => {
      const previousImages = reorderRollbackRef.current;

      if (previousImages) {
        onProductChange((currentProduct) => {
          if (!currentProduct) {
            return currentProduct;
          }

          return {
            ...currentProduct,
            images: previousImages,
          };
        });
      }

      void queryClient.invalidateQueries({ queryKey: ['admin', 'product', product.id] });
    },
    onSettled: () => {
      reorderRollbackRef.current = null;
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || isReordering) {
      return;
    }

    const nextImages = moveSortableItems(images, String(active.id), String(over.id));

    if (nextImages === images) {
      return;
    }

    reorderRollbackRef.current = images;

    onProductChange((currentProduct) => {
      if (!currentProduct) {
        return currentProduct;
      }

      return {
        ...currentProduct,
        images: nextImages,
      };
    });

    const changedImages = buildSortOrderUpdates(images, nextImages);

    if (changedImages.length === 0) {
      reorderRollbackRef.current = null;
      return;
    }

    reorderImages({
      productId: product.id,
      imageIds: nextImages.map((image) => image.id),
    });
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
    <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
      <div className="mb-6 space-y-4">
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-foreground">Media & Images</h2>
          <p className="text-sm text-muted-foreground">Upload multiple images. Drag to reorder and changes save automatically.</p>
        </div>
        <div className="relative border border-border/50 rounded-lg overflow-hidden transition-colors hover:border-primary/50">
          {isUploading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 ">
              <span className="text-sm font-medium text-primary shadow-sm bg-card px-3 py-1.5 rounded-full border border-primary/20">Uploading...</span>
            </div>
          )}
          <FileUpload onChange={handleFileChange} multiple accept="image/*" maxSizeBytes={5 * 1024 * 1024} />
        </div>
      </div>

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">No images uploaded yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Upload product photography, packaging shots, or promo art.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((image) => image.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {images.map((image, index) => (
                <SortableProductImageCard
                  key={image.id}
                  image={image}
                  isDeleting={isDeleting}
                  isReordering={isReordering}
                  onDelete={handleDelete}
                  previewSrc={resolveAdminImageSrc(image.url, image.storageKey)}
                  label={getImageLabel(image.storageKey, image.url, index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
