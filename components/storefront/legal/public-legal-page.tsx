import type { IPublicLegalDocument } from '@/interfaces/legal';
import type { IShippingSettings } from '@/interfaces/shipping';
import { formatPrice } from '@/lib/utils';
import {
  FLAT_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_CURRENCY,
} from '@/utils/shipping';

const CANONICAL_LABELS: Record<string, string> = {
  shipping_returns: 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

const UPDATED_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatUpdatedDate(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return UPDATED_DATE_FORMATTER.format(date);
}

function ShippingRatesSection({ settings }: { settings: IShippingSettings | null }) {
  const shippingSettings = settings ?? {
    flatShippingCents: FLAT_SHIPPING_CENTS,
    freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
    currency: SHIPPING_CURRENCY,
  };
  const freeShippingThreshold = `${formatPrice(shippingSettings.freeShippingThresholdCents, shippingSettings.currency)} ${shippingSettings.currency}`;

  return (
    <section className="mb-10 rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Shipping Rates Across Canada
      </h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Shipping Method</th>
              <th className="px-4 py-3 font-medium">Requirement</th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="py-3 pl-4 font-medium">Area</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="py-4 pr-4 font-medium text-foreground text-nowrap">Standard Shipping</td>
              <td className="px-4 py-4 text-muted-foreground">
                {/* TEMP: Tax disabled (not collecting tax yet) */}
                {/* Orders below {freeShippingThreshold} before shipping and tax */}
                Orders below {freeShippingThreshold} before shipping
              </td>
              <td className="px-4 py-4 text-right font-semibold text-foreground text-nowrap">
                {formatPrice(shippingSettings.flatShippingCents, shippingSettings.currency)} {shippingSettings.currency}
              </td>
              <td className="py-4 pl-4 text-muted-foreground">Canada</td>
            </tr>
            <tr>
              <td className="py-4 pr-4 font-medium text-foreground text-nowrap">Free Shipping</td>
              <td className="px-4 py-4 text-muted-foreground">
                {/* TEMP: Tax disabled (not collecting tax yet) */}
                {/* Orders {freeShippingThreshold} or above before shipping and tax */}
                Orders {freeShippingThreshold} or above before shipping
              </td>
              <td className="px-4 py-4 text-right font-semibold text-foreground">FREE</td>
              <td className="py-4 pl-4 text-muted-foreground">Canada</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        **Free shipping applies to a single order subtotal and cannot be combined across multiple orders.
      </p>
    </section>
  );
}

export function PublicLegalPage({
  doc,
  shippingSettings = null,
}: {
  doc: IPublicLegalDocument;
  shippingSettings?: IShippingSettings | null;
}) {
  const label = CANONICAL_LABELS[doc.type] ?? 'Legal Document';
  const lastUpdated = formatUpdatedDate(doc.updatedAt);
  const shouldShowShippingRates = doc.type === 'shipping_returns';

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mb-10 border-b border-border/60 pb-6 sm:mb-12 sm:pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            {doc.title || label}
          </h1>
          {lastUpdated ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          ) : null}
        </header>

        {shouldShowShippingRates ? <ShippingRatesSection settings={shippingSettings} /> : null}

        <article className="space-y-5 break-words text-base leading-8 text-foreground">
          {doc.content.split(/\n\n+/).map((paragraph, idx) => (
            <p key={idx} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </article>
      </div>
    </div>
  );
}
