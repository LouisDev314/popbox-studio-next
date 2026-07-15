import Link from 'next/link';
import { AuthCallbackClient } from '@/components/auth/auth-forms';
import { BrandLogo } from '@/components/layout/brand-logo';

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-10">
        <Link href="/" aria-label="PopBox Studio home" className="mx-auto flex w-fit items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandLogo className="size-12" />
          <span className="font-semibold tracking-tight">PopBox Studio</span>
        </Link>
        <AuthCallbackClient />
      </div>
    </main>
  );
}
