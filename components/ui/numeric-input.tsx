'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type NumericInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'pattern' | 'value' | 'onChange'
> & {
  value: string;
  onValueChange: (value: string) => void;
  allowEmpty?: boolean;
  normalizeLeadingZeros?: boolean;
};

export function NumericInput({
                               value,
                               onValueChange,
                               allowEmpty = true,
                               normalizeLeadingZeros = false,
                               className,
                               ...props
                             }: NumericInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;

    // digits only
    if (!/^\d*$/.test(nextValue)) return;

    // optionally block empty value
    if (!allowEmpty && nextValue === '') {
      onValueChange('0');
      return;
    }

    let normalized = nextValue;

    if (normalizeLeadingZeros && normalized !== '') {
      normalized = normalized.replace(/^0+(?=\d)/, '');
    }

    onValueChange(normalized);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={handleChange}
      className={cn(className)}
    />
  );
}
