'use client';

import {
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface IStorefrontDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  overlay?: ReactNode;
  canClose?: boolean;
  side?: 'left' | 'right';
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  headerClassName?: string;
  triggerButtonId?: string;
  closeButtonLabel?: string;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.hasAttribute('inert')) {
      return false;
    }

    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    return true;
  });
}

export function StorefrontDrawer(props: IStorefrontDrawerProps) {
  const {
    ariaLabel,
    bodyClassName,
    canClose = true,
    children,
    className,
    closeButtonLabel = 'Close drawer',
    contentClassName,
    footer,
    footerClassName,
    headerClassName,
    isOpen,
    onClose,
    overlay,
    side = 'right',
    title,
    triggerButtonId,
  } = props;
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const titleId = title || ariaLabel
    ? `${triggerButtonId ?? `storefront-drawer-${side}`}-title`
    : undefined;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      if (canClose) {
        closeButtonRef.current?.focus();
        return;
      }

      panelRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!panelRef.current) {
        return;
      }

      if (event.key === 'Escape') {
        if (!canClose) {
          return;
        }

        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(panelRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!panelRef.current.contains(activeElement)) {
        event.preventDefault();
        firstFocusable.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);

      window.requestAnimationFrame(() => {
        const triggerButton = triggerButtonId ? document.getElementById(triggerButtonId) : null;
        (triggerButton instanceof HTMLElement ? triggerButton : previouslyFocusedElement)?.focus();
      });
    };
  }, [canClose, isOpen, onClose, triggerButtonId]);

  const handleOverlayClick = () => {
    if (!canClose) {
      return;
    }

    onClose();
  };

  const sideClassName = side === 'left'
    ? {
      border: 'left-0 border-r',
      closed: '-translate-x-full',
    }
    : {
      border: 'right-0 border-l',
      closed: 'translate-x-full',
    };

  return (
    <>
      <div
        data-slot="storefront-drawer-overlay"
        className={cn(
          'fixed inset-0 z-[70] bg-foreground/12 backdrop-blur-md transition-opacity duration-300',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        data-slot="storefront-drawer-panel"
        role="dialog"
        aria-modal={true}
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 z-[71] flex w-9/10 sm:w-3/5 lg:w-1/3 xl:w-1/4 flex-col border-border/70 bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none',
          sideClassName.border,
          isOpen ? 'pointer-events-auto translate-x-0' : `pointer-events-none ${sideClassName.closed}`,
          className,
        )}
      >
        {(title || canClose) ? (
          <div className={cn('flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6', headerClassName)}>
            {title ? (
              <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            ) : (
              <span id={titleId} className="sr-only">
                {ariaLabel}
              </span>
            )}
            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="icon"
              aria-label={closeButtonLabel}
              disabled={!canClose}
              onClick={onClose}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : null}

        <div className={cn('relative flex min-h-0 flex-1 flex-col', contentClassName)}>
          <div className={cn('flex-1 overflow-y-auto px-5 py-5 sm:px-2', bodyClassName)}>
            {children}
          </div>

          {footer ? (
            <div className={cn('border-t border-border/70 px-5 py-5 sm:px-6', footerClassName)}>
              {footer}
            </div>
          ) : null}

          {overlay}
        </div>
      </aside>
    </>
  );
}
