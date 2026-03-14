'use client';

import { type ReactNode, useEffect } from 'react';
import { cn } from '@/utils/helpers';

interface IMobileNavOverlayProps {
  ariaLabel: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  panelClassName?: string;
}

export function MobileNavOverlay(props: IMobileNavOverlayProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-x-0 top-16 bottom-0 z-40 transition-opacity duration-300 md:hidden',
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
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
        onClick={onClose}
      />
      <div
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label={props.ariaLabel}
        className={cn(
          'absolute inset-x-0 top-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isOpen ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
          props.panelClassName,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}
