/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KujiPrizeTiles } from '@/components/kuji/kuji-prize-tiles';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={alt ?? ''} />,
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
        }]}
      />,
    );

    const prizeTile = screen.getByRole('button', { name: /Prize One/i });

    expect(prizeTile).toHaveClass('rounded-[1.15rem]');
    expect(screen.getByText('Ichiban Kuji Moonlight Parade')).toBeInTheDocument();

    await user.click(prizeTile);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('Premium prize details');
    });
  });
});
