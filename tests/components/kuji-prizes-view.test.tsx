/* eslint-disable @next/next/no-img-element */

import { forwardRef, type ImgHTMLAttributes } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KujiPrizesView } from '@/components/product/kuji-prizes-view';
import { type IKujiPrize } from '@/interfaces/product';

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

function createPrize(overrides: Partial<IKujiPrize>): IKujiPrize {
  return {
    description: null,
    id: overrides.id ?? 'prize',
    imageUrl: null,
    initialQuantity: 10,
    name: 'Prize',
    prizeCode: 'A1',
    prizeTier: 'A',
    remainingQuantity: 3,
    sortOrder: 0,
    ...overrides,
  };
}

describe('KujiPrizesView', () => {
  it('groups prizes by tier and sorts each group by existing prize ordering', () => {
    render(
      <KujiPrizesView
        prizes={[
          createPrize({
            id: 'last-one',
            initialQuantity: 1,
            name: 'Last One Bonus',
            prizeCode: 'LO',
            prizeTier: 'LO',
            remainingQuantity: 1,
            sortOrder: 0,
          }),
          createPrize({
            id: 'b-1',
            name: 'Prize B Figure',
            prizeCode: 'B1',
            prizeTier: 'B',
            sortOrder: 0,
          }),
          createPrize({
            id: 'a-2',
            name: 'Prize A Acrylic Stand',
            prizeCode: 'A2',
            prizeTier: 'A',
            sortOrder: 1,
          }),
          createPrize({
            id: 'a-1',
            name: 'Prize A Plush Doll',
            prizeCode: 'A1',
            prizeTier: 'A',
            sortOrder: 0,
          }),
        ]}
      />,
    );

    const sectionHeadings = screen.getAllByRole('heading', { level: 3 })
      .filter((heading) => ['Prize A', 'Prize B', 'Last One Prize'].includes(heading.textContent ?? ''));

    expect(sectionHeadings.map((heading) => heading.textContent)).toEqual([
      'Prize A',
      'Prize B',
      'Last One Prize',
    ]);

    const prizeASection = screen.getByRole('region', { name: 'Prize A' });
    const prizeBSection = screen.getByRole('region', { name: 'Prize B' });
    const lastOneSection = screen.getByRole('region', { name: 'Last One Prize' });

    expect(within(prizeASection).getAllByRole('button').map((card) => card.textContent)).toEqual([
      expect.stringContaining('Prize A Plush Doll'),
      expect.stringContaining('Prize A Acrylic Stand'),
    ]);
    expect(within(prizeBSection).getByRole('button')).toHaveTextContent('Prize B Figure');
    expect(within(lastOneSection).getByRole('button')).toHaveTextContent('Last One Bonus');
  });

  it('shows remaining over initial quantity for every prize, including Last One', () => {
    render(
      <KujiPrizesView
        prizes={[
          createPrize({
            id: 'a-1',
            initialQuantity: 10,
            name: 'Prize A Plush Doll',
            prizeCode: 'A1',
            prizeTier: 'A',
            remainingQuantity: 3,
          }),
          createPrize({
            id: 'last-one',
            initialQuantity: 1,
            name: 'Last One Bonus',
            prizeCode: 'LO',
            prizeTier: 'LO',
            remainingQuantity: 1,
          }),
        ]}
      />,
    );

    expect(screen.getByText('3 / 10')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.queryByText(/last one left/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/the last one left/i)).not.toBeInTheDocument();
  });

  it('uses image skeletons for Kuji PDP prize images before they load', () => {
    render(
      <KujiPrizesView
        prizes={[
          createPrize({
            id: 'a-1',
            imageUrl: 'https://cdn.example.com/prizes/a-plush.jpg',
            name: 'Prize A Plush Doll',
            prizeCode: 'A1',
            prizeTier: 'A',
          }),
        ]}
      />,
    );

    const prizeCard = screen.getByRole('button', { name: /Prize A Plush Doll/i });

    expect(within(prizeCard).getByTestId('storefront-image-skeleton')).toHaveClass(
      'absolute',
      'inset-0',
      'h-full',
      'w-full',
    );
  });
});
