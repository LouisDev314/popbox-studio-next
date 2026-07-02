'use client';

import { cn } from '@/lib/utils';

export const ADMIN_FILTER_FIELD_CLASSES = 'h-11 w-full rounded-[16px] border border-[#ded5c7] bg-white px-3.5 text-sm text-[#111827] outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-[#f8f4eb] disabled:text-[#8f8577] disabled:opacity-80';

interface IAdminFilterSelectOption {
  label: string;
  value: string;
}

interface IAdminFilterSelectProps {
  className?: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly IAdminFilterSelectOption[];
  value: string;
}

export function AdminFilterSelect(props: IAdminFilterSelectProps) {
  return (
    <div className={props.className}>
      <label
        htmlFor={props.id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8f8577]"
      >
        {props.label}
      </label>
      <select
        id={props.id}
        className={cn(ADMIN_FILTER_FIELD_CLASSES)}
        disabled={props.disabled}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
