'use client';

import { type FormEvent } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IAdminSearchFormProps {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  value: string;
}

export function AdminSearchForm(props: IAdminSearchFormProps) {
  const showClear = props.value.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    props.onSubmit(String(formData.get('search') ?? props.value));
  };

  return (
    <form className={cn('flex flex-col gap-2.5 sm:flex-row', props.className)} onSubmit={handleSubmit}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#9ca3af]" />
        <input
          type="search"
          name="search"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          aria-label={props.ariaLabel}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'h-12 w-full rounded-[18px] border border-[#dfd5c5] bg-white pl-11 pr-12 text-sm text-[#111827] outline-none transition',
            'placeholder:text-[#9ca3af] focus:border-primary/60 focus:ring-2 focus:ring-primary/20',
            '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
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
      <Button
        type="submit"
        className="h-12 rounded-[18px] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_18px_38px_-28px_hsl(var(--primary)/0.72)] hover:bg-primary/90 sm:w-auto"
      >
        Search
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
