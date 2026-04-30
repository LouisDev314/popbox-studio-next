/* eslint-disable @next/next/no-img-element */

import { forwardRef, type ImgHTMLAttributes } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KujiPrizeTiles } from '@/components/kuji/kuji-prize-tiles';

function loadImageWithNaturalSize(image: HTMLImageElement, naturalWidth: number, naturalHeight: number) {
  Object.defineProperty(image, 'naturalWidth', {
    configurable: true,
    value: naturalWidth,
  });
  Object.defineProperty(image, 'naturalHeight', {
    configurable: true,
    value: naturalHeight,
  });
  fireEvent.load(image);
}

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

    loadImageWithNaturalSize(within(prizeTile).getByAltText('Prize One'), 800, 800);

    expect(within(prizeTile).queryByTestId('storefront-image-skeleton')).not.toBeInTheDocument();

    await user.click(prizeTile);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('Premium prize details');
    });
  });

  it('sizes regular prize image frames from the loaded image ratio instead of a fixed square crop', () => {
    render(
      <KujiPrizeTiles
        enableDialog={false}
        items={[{
          description: null,
          id: 'prize-landscape',
          imageUrl: 'https://cdn.example.com/prizes/prize-landscape.jpg',
          name: 'Landscape Prize',
          prizeCode: 'B',
          prizeTier: 'B',
        }]}
      />,
    );

    const prizeTile = screen.getByRole('article');
    const imageFrame = within(prizeTile).getByTestId('kuji-prize-image-frame');

    expect(imageFrame).toHaveClass('aspect-[4/3]');
    expect(imageFrame).not.toHaveStyle({ aspectRatio: '2' });

    loadImageWithNaturalSize(within(prizeTile).getByAltText('Landscape Prize'), 1200, 600);

    expect(imageFrame).toHaveStyle({ aspectRatio: '2' });
  });
});
