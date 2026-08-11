import type { IShippingSettings } from '@/interfaces/shipping';
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
    settings: IShippingSettings | null;
  }
);

function getPolicyMessage(settings: IShippingSettings | null): string {
  return settings
    ? `Free shipping from ${formatPrice(settings.calgaryFreeShippingThresholdCents, settings.currency)} in Calgary, ${formatPrice(settings.albertaFreeShippingThresholdCents, settings.currency)} in Alberta, or ${formatPrice(settings.freeShippingThresholdCents, settings.currency)} across Canada.`
    : 'Shipping is calculated after details are provided.';
}

export function FreeShippingStatus(props: FreeShippingStatusProps) {
  const message = props.mode === 'generic'
    ? getPolicyMessage(props.settings)
    : props.isFree
      ? 'Free shipping unlocked.'
      : getPolicyMessage(props.settings);

  return (
    <p className={cn('font-medium text-foreground', props.className)}>
      {message}
    </p>
  );
}
