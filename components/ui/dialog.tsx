'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';

import { cn } from '@/lib/utils';

const EXIT_ANIMATION_MS = 300;

type DialogRootProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;
type DialogAnimationContextValue = {
  visualState: 'open' | 'closed';
};

const DialogAnimationContext = createContext<DialogAnimationContextValue>({
  visualState: 'closed',
});

function useDialogAnimationState() {
  return useContext(DialogAnimationContext);
}

function Dialog({
  children,
  defaultOpen,
  onOpenChange,
  open: openProp,
  ...props
}: DialogRootProps) {
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
  const [isPresent, setIsPresent] = useState(openProp ?? defaultOpen ?? false);
  const closeTimerRef = useRef<number | null>(null);
  const open = isControlled ? openProp : uncontrolledOpen;
  const actualOpen = open || isPresent;
  const visualState: 'open' | 'closed' = open ? 'open' : 'closed';

  useEffect(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setIsPresent(true);
      return;
    }

    if (!isPresent) {
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsPresent(false);
      closeTimerRef.current = null;
    }, EXIT_ANIMATION_MS);

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isPresent, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setIsPresent(true);

      if (!isControlled) {
        setUncontrolledOpen(true);
      }

      onOpenChange?.(true);
      return;
    }

    if (!open && !isPresent) {
      return;
    }

    if (!isControlled) {
      setUncontrolledOpen(false);
    }

    onOpenChange?.(false);
  };

  return (
    <DialogAnimationContext.Provider value={{ visualState }}>
      <DialogPrimitive.Root
        defaultOpen={defaultOpen}
        open={actualOpen}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogAnimationContext.Provider>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const { visualState } = useDialogAnimationState();

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-state={visualState}
      className={cn(
        'fixed inset-0 z-50 bg-black/65 backdrop-blur-md',
        'duration-300 ease-out fill-mode-both data-[state=closed]:!pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        'data-[state=open]:!pointer-events-auto',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
});

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, className, ...props }, ref) => {
  const { visualState } = useDialogAnimationState();
  const lastChildrenRef = useRef(children);
  const lastClassNameRef = useRef(className);

  useEffect(() => {
    if (visualState === 'open') {
      lastChildrenRef.current = children;
      lastClassNameRef.current = className;
    }
  }, [children, className, visualState]);

  const renderedChildren = visualState === 'open' ? children : lastChildrenRef.current;
  const renderedClassName = visualState === 'open' ? className : lastClassNameRef.current;

  return (
    <DialogPortal>
      <DialogOverlay />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <DialogPrimitive.Content
          ref={ref}
          data-state={visualState}
          className={cn(
            'relative grid w-full max-w-[72rem] max-h-[calc(100dvh-1.5rem)] gap-4 overflow-hidden',
            'rounded-[2rem] border border-border/70 bg-background shadow-[0_32px_90px_-34px_rgba(15,23,42,0.55)]',
            'duration-300 ease-out will-change-transform fill-mode-both data-[state=closed]:!pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-6',
            'data-[state=open]:!pointer-events-auto',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-6',
            'sm:max-h-[calc(100dvh-3rem)]',
            renderedClassName,
          )}
          {...props}
        >
          {renderedChildren}

          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full',
              'border border-white/35 bg-background/78 text-foreground/75 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.55)]',
              'backdrop-blur-xl transition-all duration-200 hover:bg-background/92 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'supports-[backdrop-filter]:bg-background/62 sm:right-5 sm:top-5',
            )}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
});

DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-2xl font-bold tracking-tight text-foreground', className)}
    {...props}
  />
));

DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm leading-6 text-muted-foreground', className)}
    {...props}
  />
));

DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
