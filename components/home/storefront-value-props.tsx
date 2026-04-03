import { ShieldCheck, Users, Zap } from 'lucide-react';

const VALUE_PROPS = [
  { icon: ShieldCheck, label: '100% Authentic' },
  { icon: Zap, label: 'Express Shipping' },
  { icon: Users, label: 'Active Community' },
];

export function StorefrontValueProps() {
  return (
    <div className="hidden border-y border-border bg-card md:block">
      <div className="container mx-auto flex justify-center gap-12 px-6 py-4">
        {VALUE_PROPS.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4 text-primary" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
