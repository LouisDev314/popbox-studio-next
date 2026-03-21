import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Orders — PopBox Studio Admin',
};

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Orders</h1>
      <p className="mt-1 text-sm text-[#514349]">
        Monitor and process customer transactions.
      </p>
    </div>
  );
}
