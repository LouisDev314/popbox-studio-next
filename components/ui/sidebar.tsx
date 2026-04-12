'use client';

import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ISidebarContextValue {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const SidebarContext = createContext<ISidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a Sidebar.');
  }

  return context;
}

interface ISidebarProps {
  children: ReactNode;
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
}

export function Sidebar(props: ISidebarProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = props.open ?? uncontrolledOpen;
  const setOpen = props.setOpen ?? setUncontrolledOpen;
  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <SidebarContext.Provider value={value}>{props.children}</SidebarContext.Provider>;
}

interface ISidebarBodyProps {
  children: ReactNode;
  className?: string;
  desktopClassName?: string;
  mobileClassName?: string;
}

export function SidebarBody(props: ISidebarBodyProps) {
  return (
    <>
      <DesktopSidebar className={cn(props.className, props.desktopClassName)}>
        {props.children}
      </DesktopSidebar>
      <MobileSidebar className={cn(props.className, props.mobileClassName)}>
        {props.children}
      </MobileSidebar>
    </>
  );
}

interface ISidebarSurfaceProps {
  children: ReactNode;
  className?: string;
}

function DesktopSidebar(props: ISidebarSurfaceProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden w-[280px] shrink-0 border-r border-[#e4dccf] bg-[#f3efe6] md:flex md:flex-col',
        props.className,
      )}
    >
      {props.children}
    </aside>
  );
}

function MobileSidebar(props: ISidebarSurfaceProps) {
  const { open, setOpen } = useSidebar();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfd5c5] bg-[#fbfaf7]/95 text-[#1f2937] shadow-[0_14px_34px_-24px_rgba(31,41,55,0.45)] backdrop-blur"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        {open ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation overlay"
              className="fixed inset-0 z-40 bg-[#1f2937]/24 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className={cn(
                'fixed inset-y-0 left-0 z-50 flex w-[calc(100vw-2.75rem)] max-w-[296px] flex-col border-r border-[#e4dccf] bg-[#f3efe6] shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)]',
                props.className,
              )}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: 'easeInOut' }}
            >
              {props.children}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
