'use client';

import { type FormEvent, useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SearchPageClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search/results?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 select-none sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/70 bg-card px-6 py-10 text-center shadow-sm sm:px-8">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight text-foreground">
          What are you looking for?
        </h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              autoFocus
              className="h-12 rounded-xl border-border/80 pl-10 text-lg"
              placeholder="Search figures, kuji, series..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-12 rounded-xl px-8">
            Search
          </Button>
        </form>
      </div>
    </div>
  );
}
