'use client';

import { type FormEvent, useRef, useState, useTransition } from 'react';
import { CircleX, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function SearchPageClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const trimmedQuery = query.trim();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (trimmedQuery) {
      startTransition(() => {
        router.push(`/search/results?q=${encodeURIComponent(trimmedQuery)}`);
      });
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="container mx-auto px-4 py-20 select-none sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/70 bg-card px-6 py-10 text-center shadow-sm sm:px-8">
        <h1 className="mb-8 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
          What are you looking for?
        </h1>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-busy={isPending}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              autoFocus
              ref={inputRef}
              className="h-12 rounded-xl border-border/80 pl-10 pr-12 text-lg"
              placeholder="Search figures, kuji, series..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.length > 0 ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                onClick={handleClear}
              >
                <CircleX className="size-4" />
              </button>
            ) : null}
          </div>
          <Button type="submit" size="lg" className="h-12 rounded-xl px-8 sm:shrink-0" disabled={isPending || !trimmedQuery}>
            {isPending ? <Spinner className="size-4" /> : null}
            {isPending ? 'Searching...' : 'Search'}
          </Button>
        </form>
      </div>
    </div>
  );
}
