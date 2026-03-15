'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/utils/helpers';

interface IMobileNavOverlayProps {
  ariaLabel: string;
  children: ReactNode;
  initialFocusId?: string;
  isOpen: boolean;
  onClose: () => void;
  panelClassName?: string;
  containerClassName?: string;
  restoreFocusId?: string;
}

export function MobileNavOverlay(props: IMobileNavOverlayProps) {
  const ariaLabel = props.ariaLabel;
  const children = props.children;
  const initialFocusId = props.initialFocusId;
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const panelClassName = props.panelClassName;
  const containerClassName = props.containerClassName;
  const restoreFocusId = props.restoreFocusId;
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      const focusTarget =
        (initialFocusId ? document.getElementById(initialFocusId) : null) ??
        panelRef.current;
      focusTarget?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);

      window.requestAnimationFrame(() => {
        const focusTarget =
          (restoreFocusId ? document.getElementById(restoreFocusId) : null) ??
          previouslyFocusedElement;
        focusTarget?.focus();
      });
    };
  }, [initialFocusId, isOpen, onClose, restoreFocusId]);

  return (
    <div
      className={cn(
        'fixed inset-x-0 top-16 bottom-0 z-40 transition-opacity duration-300',
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        containerClassName,
      )}
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-foreground/10 backdrop-blur-[3px] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0',
        )}
        aria-label="Close navigation overlay"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={true}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 top-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none',
          isOpen ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
