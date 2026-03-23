'use client';

import { type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function useAdminSortable(id: string, disabled = false) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const handleProps: ButtonHTMLAttributes<HTMLButtonElement> = {
    ...attributes,
    ...listeners,
  };

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return {
    handleProps,
    isDragging,
    setNodeRef,
    style,
  };
}

interface ISortableHandleProps {
  label: string;
  disabled?: boolean;
  className?: string;
  handleProps: ButtonHTMLAttributes<HTMLButtonElement>;
}

export function SortableHandle({
  label,
  disabled = false,
  className,
  handleProps,
}: ISortableHandleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'h-8 w-8 rounded-md text-[#514349] hover:bg-white hover:text-[#191C1E] focus-visible:ring-2 focus-visible:ring-primary/40',
        'cursor-grab active:cursor-grabbing touch-none disabled:cursor-not-allowed',
        className,
      )}
      {...handleProps}
    >
      <GripVertical className="h-4 w-4" />
    </Button>
  );
}
