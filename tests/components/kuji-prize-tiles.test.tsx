/* eslint-disable @next/next/no-img-element */

import { forwardRef, type ImgHTMLAttributes } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KujiPrizeTiles } from '@/components/kuji/kuji-prize-tiles';

vi.mock('next/image', () => ({
  default: forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }>(function MockNextImage({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }, ref) {
    return <img ref={ref} {...props} alt={alt ?? ''} />;
  }),
}));

describe('KujiPrizeTiles', () => {
  it('renders compact revealed-prize metadata and keeps the detail dialog interactive', async () => {
    const user = userEvent.setup();

    render(
      <KujiPrizeTiles
        compact
        items={[{
          description: 'Premium prize details',
          id: 'ticket-1',
          imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
          kujiProductName: 'Ichiban Kuji Moonlight Parade',
          name: 'Prize One',
          prizeCode: 'A',
          prizeTier: 'A',
        }]}
      />,
    );

    const prizeTile = screen.getByRole('button', { name: /Prize One/i });

    expect(prizeTile).toHaveClass('rounded-[1.15rem]');
    expect(screen.getByText('Ichiban Kuji Moonlight Parade')).toBeInTheDocument();
    expect(within(prizeTile).getByTestId('storefront-image-skeleton')).toHaveClass(
      'absolute',
      'inset-0',
      'h-full',
      'w-full',
    );

    fireEvent.load(within(prizeTile).getByAltText('Prize One'));

    expect(within(prizeTile).queryByTestId('storefront-image-skeleton')).not.toBeInTheDocument();

    await user.click(prizeTile);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('Premium prize details');
    });
  });
});
