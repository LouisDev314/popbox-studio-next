import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/components/app-providers';

function QueryClientConsumer() {
  const queryClient = useQueryClient();

  return (
    <div>
      {queryClient ? 'query client available' : 'query client missing'}
    </div>
  );
}

describe('AppProviders', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  it('keeps React Query consumers under a QueryClientProvider', () => {
    render(
      <AppProviders>
        <QueryClientConsumer />
      </AppProviders>,
    );

    expect(screen.getByText('query client available')).toBeInTheDocument();
  });

  it('guards against the unwrapped React Query regression', () => {
    expect(() => render(<QueryClientConsumer />)).toThrow(
      'No QueryClient set, use QueryClientProvider to set one',
    );
  });
});
