import Link from 'next/link';

export function StoreFooter() {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <span className="font-bold text-xl tracking-tight text-primary">PopBox Studio</span>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
              Your premium destination for exclusive Ichiban Kuji and authentic collectible figures. Discover your next favorite prize today.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Shop</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?type=kuji" className="text-sm text-muted-foreground hover:text-foreground">
                  Ichiban Kuji
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
                  Search
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Support</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/legal/faq" className="text-sm text-muted-foreground hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground cursor-not-allowed">
                  Contact Us
                </span>
              </li>
              <li>
                <Link href="/legal/shipping-returns" className="text-sm text-muted-foreground hover:text-foreground">
                  Shipping & Returns
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PopBox Studio. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link href="/legal/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
