import type { IPublicLegalDocument } from '@/interfaces/legal';
import type { IShippingSettings } from '@/interfaces/shipping';
import { formatPrice } from '@/lib/utils';
import { normalizePublicShippingSettings } from '@/utils/shipping';

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
  const shippingSettings = normalizePublicShippingSettings(settings);
  const flatShipping = `${formatPrice(shippingSettings.flatShippingCents, shippingSettings.currency)} ${shippingSettings.currency}`;
  const regions = [
    {
      area: 'Calgary',
      detail: 'Based on the shipping postal code',
      thresholdCents: shippingSettings.calgaryFreeShippingThresholdCents,
    },
    {
      area: 'Alberta outside Calgary',
      detail: 'All other Alberta destinations',
      thresholdCents: shippingSettings.albertaFreeShippingThresholdCents,
    },
    {
      area: 'Rest of Canada',
      detail: 'All other Canadian provinces and territories',
      thresholdCents: shippingSettings.freeShippingThresholdCents,
    },
  ];

  return (
    <section className="mb-10 rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Shipping rates across Canada
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        We currently ship within Canada. Standard shipping is {flatShipping} for orders below the applicable free-shipping threshold.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Destination</th>
              <th className="px-4 py-3 font-medium">Free shipping</th>
              <th className="py-3 pl-4 text-right font-medium">Below threshold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {regions.map((region) => (
              <tr key={region.area}>
                <td className="py-4 pr-4">
                  <span className="block font-medium text-foreground">{region.area}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{region.detail}</span>
                </td>
                <td className="px-4 py-4 font-semibold text-foreground text-nowrap">
                  {formatPrice(region.thresholdCents, shippingSettings.currency)} {shippingSettings.currency}+
                </td>
                <td className="py-4 pl-4 text-right font-semibold text-foreground text-nowrap">
                  {flatShipping}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 space-y-2 text-sm leading-6 text-muted-foreground">
        <p>Free-shipping thresholds use the merchandise subtotal before tax and shipping.</p>
        <p>Calgary eligibility is determined from the shipping postal code.</p>
        <p>Free-shipping eligibility is determined when your checkout total is calculated. Promotional discounts applied afterward do not change the shipping rate already quoted.</p>
        <p>Free shipping applies to a single order subtotal and cannot be combined across multiple orders.</p>
      </div>
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
