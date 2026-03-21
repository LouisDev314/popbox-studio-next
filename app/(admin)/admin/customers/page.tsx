import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customers — PopBox Studio Admin',
};

export default function AdminCustomersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Customers</h1>
      <p className="mt-1 text-sm text-[#514349]">
        View your customer directory and order history.
      </p>
    </div>
  );
}
