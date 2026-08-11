import type {
  IFreeShippingProgress,
  IShippingSettings,
} from '@/interfaces/shipping';
import { cn, formatPrice } from '@/lib/utils';

type FreeShippingStatusProps = {
  className?: string;
} & (
  | {
    mode: 'generic';
    settings: IShippingSettings | null;
  }
  | {
    isFree: boolean;
    mode: 'contextual';
    progress: IFreeShippingProgress | null;
  }
);

function getContextualMessage(
  progress: IFreeShippingProgress | null,
  isFree: boolean,
): string | null {
  if (isFree) {
    return 'Free shipping unlocked.';
  }

  if (!progress || progress.qualified) {
    return null;
  }

  const remaining = formatPrice(progress.remainingCents, 'CAD');

  if (progress.region === 'calgary') {
    return `You’re ${remaining} away from free shipping in Calgary.`;
  }

  if (progress.region === 'alberta') {
    return `You’re ${remaining} away from free shipping in Alberta.`;
  }

  return `You’re ${remaining} away from free shipping.`;
}

export function FreeShippingStatus(props: FreeShippingStatusProps) {
  const message = props.mode === 'generic'
    ? props.settings
      ? `Free shipping from ${formatPrice(props.settings.calgaryFreeShippingThresholdCents, props.settings.currency)} in Calgary, ${formatPrice(props.settings.albertaFreeShippingThresholdCents, props.settings.currency)} in Alberta, or ${formatPrice(props.settings.freeShippingThresholdCents, props.settings.currency)} across Canada.`
      : 'Shipping is calculated from your address at checkout.'
    : getContextualMessage(props.progress, props.isFree);

  if (!message) {
    return null;
  }

  return (
    <p className={cn('font-medium text-foreground', props.className)}>
      {message}
    </p>
  );
}
