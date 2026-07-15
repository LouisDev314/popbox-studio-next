import { Check, Circle, X } from 'lucide-react';
import { getPasswordRequirements } from '@/lib/auth/form-validation';
import { cn } from '@/lib/utils';

interface IPasswordRequirementsProps {
  hasInteracted: boolean;
  id: string;
  password: string;
}

export function PasswordRequirements({ hasInteracted, id, password }: IPasswordRequirementsProps) {
  const requirements = getPasswordRequirements(password);
  const items = [
    { isMet: requirements.hasMinimumLength, label: 'At least 8 characters' },
    { isMet: requirements.hasLetter, label: 'Contains a letter' },
    { isMet: requirements.hasNumber, label: 'Contains a number' },
  ];

  return (
    <ul
      id={id}
      aria-label="Password requirements"
      aria-live="polite"
      className="space-y-1.5 text-sm"
    >
      {items.map(({ isMet, label }) => {
        const state = isMet ? 'met' : hasInteracted ? 'unmet' : 'neutral';
        const Icon = isMet ? Check : hasInteracted ? X : Circle;

        return (
          <li
            key={label}
            data-state={state}
            className={cn(
              'flex items-center gap-2 text-muted-foreground',
              isMet && 'text-emerald-700 dark:text-emerald-400',
              hasInteracted && !isMet && 'text-destructive',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{isMet ? 'Met' : hasInteracted ? 'Not met' : 'Not checked'}: </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
