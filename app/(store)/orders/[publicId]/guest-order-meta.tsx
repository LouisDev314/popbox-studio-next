'use client';

import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { cn } from '@/lib/utils';

interface IGuestOrderMetaProps {
  placedAt: string | null;
  publicId: string;
}

export function GuestOrderMeta(props: IGuestOrderMetaProps) {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    const didCopy = await copy(props.publicId);

    if (didCopy) {
      toast.success('Order number copied');
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-3 text-center sm:mt-8 lg:text-left">
      <div className="flex w-full justify-center items-center gap-4">
        <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Order Number
        </span>

        <div className="flex w-fit items-center rounded-2xl border border-border/60 bg-background/80 p-1.5 shadow-sm">
          <div className="min-w-0 flex-1 px-3 py-2 text-center lg:text-left">
            <span className="block break-all text-lg font-semibold tracking-tight text-primary sm:text-xl lg:text-2xl">
              {props.publicId}
            </span>
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Copy order number"
            data-state={copied ? 'copied' : 'idle'}
            className="relative h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:bg-accent/80 hover:text-foreground"
            onClick={handleCopy}
          >
            <Check
              className={cn(
                'h-4 w-4 transition-all duration-150',
                copied ? 'scale-100 opacity-100 text-foreground' : 'scale-75 opacity-0',
              )}
            />
            <Copy
              className={cn(
                'absolute h-4 w-4 transition-all duration-150',
                copied ? 'scale-75 opacity-0' : 'scale-100 opacity-100',
              )}
            />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground lg:justify-start">
        <span>Placed on</span>
        <span className="font-medium text-foreground">
          {props.placedAt ? new Date(props.placedAt).toLocaleDateString() : 'N/A'}
        </span>
      </div>
    </div>
  );
}
