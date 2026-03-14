'use client';

import * as React from 'react';
import Link from 'next/link';
import { useCartStore } from '@/hooks/use-cart';
import { ShoppingBag, Search, Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { CartDrawer } from '@/components/cart/cart-drawer';

export function StoreHeader() {
  const [isClient, setIsClient] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const cartItems = useCartStore((state) => state.items);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl tracking-tight text-primary">
              PopBox Studio
            </Link>
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <Link href="/products" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Shop All
              </Link>
              <Link href="/products?type=kuji" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Ichiban Kuji
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <span className="sr-only">Search</span>
              <Search className="h-5 w-5" />
            </Link>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative text-muted-foreground hover:text-foreground transition-colors p-2"
            >
              <span className="sr-only">Cart</span>
              <ShoppingBag className="h-5 w-5" />
              {isClient && totalItems > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </button>

            {isClient && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="hidden md:flex"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            <button
              type="button"
              className="md:hidden text-foreground p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open menu</span>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Link
              href="/products"
              className="block rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Shop All
            </Link>
            <Link
              href="/products?type=kuji"
              className="block rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Ichiban Kuji
            </Link>
          </div>
        </div>
      )}

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
