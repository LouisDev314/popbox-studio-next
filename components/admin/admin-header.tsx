import { type ReactNode } from 'react';

interface IAdminHeaderProps {
  children?: ReactNode;
}

export function AdminHeader(props: IAdminHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#D5C1C9]/20 bg-white/80 px-6 backdrop-blur-sm">
      <div className="flex-1">{props.children}</div>

      {/* Avatar placeholder */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
        aria-label="Admin user"
      >
        A
      </div>
    </header>
  );
}
