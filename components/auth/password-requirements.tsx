import { Circle, CircleCheck } from 'lucide-react';
import { getPasswordRequirements } from '@/lib/auth/form-validation';
import { cn } from '@/lib/utils';

interface IPasswordRequirementsProps {
  id: string;
  password: string;
}

export function PasswordRequirements({ id, password }: IPasswordRequirementsProps) {
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
      className="space-y-1 text-sm"
    >
      {items.map(({ isMet, label }) => {
        const Icon = isMet ? CircleCheck : Circle;

        return (
          <li
            key={label}
            data-state={isMet ? 'met' : 'unmet'}
            className={cn(
              'flex items-center gap-2 leading-5 text-muted-foreground',
              isMet && 'text-emerald-600',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{isMet ? 'Met' : 'Not met'}: </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
