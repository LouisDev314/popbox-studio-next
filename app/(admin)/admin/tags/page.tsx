import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tags — PopBox Studio Admin',
};

export default function AdminTagsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Tags</h1>
      <p className="mt-1 text-sm text-[#514349]">
        Create and manage tags for product categorization.
      </p>
    </div>
  );
}
