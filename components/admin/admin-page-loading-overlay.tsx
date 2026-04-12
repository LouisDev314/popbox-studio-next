'use client';

import { Spinner } from '@/components/ui/spinner';

interface IAdminPageLoadingOverlayProps {
  message?: string;
  title?: string;
}

export function AdminPageLoadingOverlay(props: IAdminPageLoadingOverlayProps) {
  const title = props.title ?? 'Updating products...';
  const message = props.message ?? 'Please wait while the catalog view refreshes.';

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#f6f3ec]/72 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-4 flex max-w-sm items-start gap-3 rounded-[24px] border border-[#e4dccf] bg-[#fbfaf7]/96 px-5 py-4 shadow-[0_22px_50px_-36px_rgba(17,24,39,0.42)]">
        <Spinner className="mt-0.5 h-4 w-4 shrink-0 text-[#b06707]" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#111827]">{title}</p>
          <p className="text-sm text-[#6b7280]">{message}</p>
        </div>
      </div>
    </div>
  );
}
