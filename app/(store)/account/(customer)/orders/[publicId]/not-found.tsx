import Link from 'next/link';
import { PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderNotFound() {
  return <div className="py-16 text-center"><PackageX className="mx-auto h-11 w-11 stroke-1 text-muted-foreground" /><h1 className="mt-5 text-2xl font-semibold">Order not found</h1><p className="mt-2 text-sm text-muted-foreground">This order is unavailable or does not belong to your account.</p><Button asChild className="mt-6"><Link href="/account/orders">Back to Orders</Link></Button></div>;
}
