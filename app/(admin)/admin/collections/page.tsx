import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections — PopBox Studio Admin',
};

export default function AdminCollectionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Collections</h1>
      <p className="mt-1 text-sm text-[#514349]">
        Organize products into curated sets and seasonal groupings.
      </p>
    </div>
  );
}
