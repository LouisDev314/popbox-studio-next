'use client';

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TQuantityStepperSize = 'default' | 'sm';

interface IQuantityStepperProps {
  className?: string;
  decreaseDisabled?: boolean;
  decreaseLabel?: string;
  disabled?: boolean;
  increaseDisabled?: boolean;
  increaseLabel?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  size?: TQuantityStepperSize;
  value: number;
}

const QUANTITY_STEPPER_SIZE_STYLES: Record<TQuantityStepperSize, string> = {
  default: 'h-10 px-1 [&_[data-slot=quantity-button]]:h-8 [&_[data-slot=quantity-button]]:w-8 [&_[data-slot=quantity-value]]:w-10',
  sm: 'h-9 px-1 [&_[data-slot=quantity-button]]:h-7 [&_[data-slot=quantity-button]]:w-7 [&_[data-slot=quantity-value]]:w-9',
};

export function QuantityStepper(props: IQuantityStepperProps) {
  const size = props.size ?? 'default';

  return (
    <div
      className={cn(
        'inline-flex w-fit items-center rounded-full border border-border/70 bg-background/80 shadow-sm',
        QUANTITY_STEPPER_SIZE_STYLES[size],
        props.className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full hover:bg-muted/70"
        data-slot="quantity-button"
        disabled={props.disabled || props.decreaseDisabled}
        onClick={props.onDecrease}
      >
        <Minus className="h-4 w-4" />
        <span className="sr-only">{props.decreaseLabel ?? 'Decrease quantity'}</span>
      </Button>
      <span
        className="text-center text-sm font-semibold text-foreground"
        data-slot="quantity-value"
        aria-live="polite"
      >
        {props.value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full hover:bg-muted/70"
        data-slot="quantity-button"
        disabled={props.disabled || props.increaseDisabled}
        onClick={props.onIncrease}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">{props.increaseLabel ?? 'Increase quantity'}</span>
      </Button>
    </div>
  );
}
