'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IAdminLiveSearchInputProps {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  value: string;
}

export function AdminLiveSearchInput(props: IAdminLiveSearchInputProps) {
  const showClear = props.value.trim().length > 0;

  return (
    <div className={cn('relative', props.className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#9ca3af]" />
      <input
        type="search"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        aria-label={props.ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'h-12 w-full rounded-[18px] border border-[#dfd5c5] bg-white pl-11 pr-12 text-sm text-[#111827] outline-none transition',
          'placeholder:text-[#9ca3af] focus:border-[#f4c57d] focus:ring-2 focus:ring-[#f6dfb4]',
        )}
      />
      {showClear ? (
        <button
          type="button"
          aria-label={`Clear ${props.ariaLabel.toLocaleLowerCase()}`}
          onClick={props.onClear}
          className="absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[#6b7280] transition-colors hover:bg-[#f8f4eb] hover:text-[#111827]"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
