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
    <div className="container mx-auto px-4 py-20 select-none">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-8">
          What are you looking for?
        </h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-10 h-12 text-lg rounded-full"
              placeholder="Search figures, kuji, series..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="rounded-full h-12 px-8">
            Search
          </Button>
        </form>
      </div>
    </div>
  );
}
