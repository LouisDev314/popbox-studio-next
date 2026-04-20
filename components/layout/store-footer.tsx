import Link from 'next/link';
import TikTokIcon from '@/assets/icons/tiktok-icon';
import InstagramIcon from '@/assets/icons/instagram-icon';
import FacebookIcon from '@/assets/icons/facebook-icon';

export function StoreFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-12">
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">
              PopBox <span className="text-primary">Studio</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Premium anime collectibles, Ichiban Kuji drops, and focused product discovery for collectors in Canada.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <Link
                href="https://www.tiktok.com/@popbox_studio"
                aria-label="Follow PopBox Studio on TikTok"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TikTokIcon className="size-4" />
              </Link>
              <Link
                href="https://www.instagram.com/popbox_studio/"
                aria-label="Follow PopBox Studio on Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <InstagramIcon className="size-4" />
              </Link>
              <Link
                href="https://www.facebook.com/p/PopBox-Studio-61574809973184/"
                aria-label="Follow PopBox Studio on Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FacebookIcon className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Shop</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/collections/featured" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Featured
                  </Link>
                </li>
                <li>
                  <Link href="/products?type=kuji" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Ichiban Kuji
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    All Products
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Search
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Support</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/legal/faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Company</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Legal</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link href="/legal/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PopBox Studio. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</Link>
            <Link href="/legal/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
