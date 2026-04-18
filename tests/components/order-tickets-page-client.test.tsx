/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpStatusCode, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import OrderTicketsPageClient from '@/app/(store)/orders/[publicId]/tickets/order-tickets-page-client';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import type { IBaseApiResponse } from '@/interfaces/api-response';
import type { IGuestTicketView, IOrderTicket } from '@/interfaces/order';
import { renderWithProviders } from '../test-utils';

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

vi.mock('@/configs/api/mutation-config', () => ({
  default: {
    revealAllTickets: vi.fn(),
    revealTicket: vi.fn(),
  },
}));

vi.mock('@/configs/api/query-config', () => ({
  default: {
    fetchGuestTickets: vi.fn(),
  },
}));

function createTicket(overrides: Partial<IOrderTicket> = {}): IOrderTicket {
  return {
    id: 'ticket-1',
    ticketNumber: '0001',
    revealedAt: null,
    voidedAt: null,
    voidReason: null,
    prize: null,
    kujiProduct: {
      id: 'product-1',
      name: 'Test Product 1',
      slug: 'test-product-1',
      imageUrl: 'https://cdn.example.com/products/test-product-1.jpg',
      imageAltText: 'Test Product 1',
    },
    createdAt: '2026-04-12T00:00:00.000Z',
    ...overrides,
  };
}

function createViewData(overrides: Partial<IGuestTicketView> = {}): IGuestTicketView {
  const unrevealed = overrides.unrevealed ?? [createTicket()];
  const revealed = overrides.revealed ?? [];
  const tickets = overrides.tickets ?? [...revealed, ...unrevealed];

  return {
    tickets,
    revealed,
    unrevealed,
    counts: overrides.counts ?? {
      total: revealed.length + unrevealed.length,
      revealed: revealed.length,
      unrevealed: unrevealed.length,
    },
  };
}

function createApiResponse<T>(data: T): AxiosResponse<IBaseApiResponse<T>> {
  return {
    config: {},
    data: {
      code: HttpStatusCode.Ok,
      data,
      message: 'ok',
      status: 'success',
      success: true,
    },
    headers: {},
    request: {},
    status: HttpStatusCode.Ok,
    statusText: 'OK',
  };
}

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

describe('OrderTicketsPageClient', () => {
  it('starts single reveal immediately and opens the video overlay', async () => {
    const user = userEvent.setup();
    const revealTicket = vi.mocked(MutationConfigs.revealTicket);

    revealTicket.mockResolvedValue(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          name: 'Prize One',
          description: null,
          imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
        },
        revealedAt: '2026-04-12T00:00:00.000Z',
      })),
    );
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData()}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[0]);

    expect(revealTicket).toHaveBeenCalledWith({
      publicId: 'pbs-TICKETS',
      ticketId: 'ticket-1',
    });
    expect(screen.getByTestId('kuji-reveal-mobile-video')).toBeInTheDocument();
  });

  it('keeps leaked prize data under Awaiting Reveal and still starts the reveal flow', async () => {
    const user = userEvent.setup();
    const revealTicket = vi.mocked(MutationConfigs.revealTicket);
    const leakedPrizeTicket = createTicket({
      prize: {
        id: 'prize-1',
        prizeCode: 'F',
        name: 'Prize One',
        description: null,
        imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
      },
      revealedAt: null,
    });

    revealTicket.mockResolvedValue(
      createApiResponse({
        ...leakedPrizeTicket,
        revealedAt: '2026-04-12T00:00:00.000Z',
      }),
    );
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData({
          unrevealed: [leakedPrizeTicket],
          revealed: [],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    expect(screen.getByText('Awaiting Reveal (1)')).toBeInTheDocument();
    expect(screen.queryByText('Revealed Prizes (1)')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Prize One' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[0]);

    expect(revealTicket).toHaveBeenCalledWith({
      publicId: 'pbs-TICKETS',
      ticketId: 'ticket-1',
    });
    expect(screen.getByTestId('kuji-reveal-mobile-video')).toBeInTheDocument();
  });

  it('keeps the overlay mounted until both the video and API are complete', async () => {
    const user = userEvent.setup();
    const deferredReveal = createDeferred<AxiosResponse<IBaseApiResponse<IOrderTicket>>>();
    const secondTicket = createTicket({
      id: 'ticket-2',
      ticketNumber: '0002',
    });

    vi.mocked(MutationConfigs.revealTicket).mockReturnValue(deferredReveal.promise);
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData({
          unrevealed: [createTicket(), secondTicket],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[0]);

    expect(screen.getByTestId('kuji-reveal-mobile-video')).toBeInTheDocument();

    fireEvent.ended(screen.getByTestId('kuji-reveal-mobile-video'));

    await waitFor(() => {
      expect(screen.getByText('Finalizing your prize')).toBeInTheDocument();
    });

    deferredReveal.resolve(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          name: 'Prize One',
          description: null,
          imageUrl: null,
        },
        revealedAt: '2026-04-12T00:00:00.000Z',
      })),
    );

    await waitFor(() => {
      expect(screen.getByText('Congratulations')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Reveal next' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to tickets' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prize One' })).toBeInTheDocument();
  });

  it('allows skipping the single reveal video and still advances into the result flow', async () => {
    const user = userEvent.setup();

    vi.mocked(MutationConfigs.revealTicket).mockResolvedValue(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          name: 'Prize One',
          description: null,
          imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
        },
        revealedAt: '2026-04-12T00:00:00.000Z',
      })),
    );
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData({
          unrevealed: [createTicket(), createTicket({ id: 'ticket-2', ticketNumber: '0002' })],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[0]);
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => {
      expect(screen.getByText('Congratulations')).toBeInTheDocument();
    });
  });

  it('advances in unrevealed order and lands the final single reveal on the summary overlay', async () => {
    const user = userEvent.setup();
    const ticketOne = createTicket({ id: 'ticket-1', ticketNumber: '0001' });
    const ticketTwo = createTicket({
      id: 'ticket-2',
      ticketNumber: '0002',
      kujiProduct: {
        id: 'product-1',
        name: 'Test Product 1',
        slug: 'test-product-1',
        imageUrl: 'https://cdn.example.com/products/test-product-1.jpg',
        imageAltText: 'Test Product 1',
      },
    });

    vi.mocked(MutationConfigs.revealTicket)
      .mockResolvedValueOnce(
        createApiResponse({
          ...ticketOne,
          prize: {
            id: 'prize-1',
            prizeCode: 'C',
            name: 'Prize One',
            description: null,
            imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
          },
          revealedAt: '2026-04-12T00:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        createApiResponse({
          ...ticketTwo,
          prize: {
            id: 'prize-2',
            prizeCode: 'G',
            name: 'Prize Two',
            description: null,
            imageUrl: 'https://cdn.example.com/prizes/prize-two.jpg',
          },
          revealedAt: '2026-04-12T00:00:00.000Z',
        }),
      );
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData({
          unrevealed: [ticketOne, ticketTwo],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[0]);
    fireEvent.ended(screen.getByTestId('kuji-reveal-mobile-video'));

    await waitFor(() => {
      expect(screen.getByText('Ticket 1 / 2')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reveal next' }));

    await waitFor(() => {
      expect(vi.mocked(MutationConfigs.revealTicket)).toHaveBeenNthCalledWith(2, {
        publicId: 'pbs-TICKETS',
        ticketId: 'ticket-2',
      });
    });

    fireEvent.ended(screen.getByTestId('kuji-reveal-mobile-video'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Reveal next' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    expect(screen.getAllByText('Prize One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prize Two').length).toBeGreaterThan(0);
  });

  it('reveals all through the video flow, supports skip, and restores focus on return', async () => {
    const user = userEvent.setup();

    vi.mocked(MutationConfigs.revealAllTickets).mockResolvedValue(
      createApiResponse(createViewData({
        revealed: [
          createTicket({
            id: 'ticket-1',
            prize: {
              id: 'prize-1',
              prizeCode: 'A',
              name: 'Prize One',
              description: null,
              imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
            },
            revealedAt: '2026-04-12T00:00:00.000Z',
          }),
        ],
        unrevealed: [],
        counts: {
          total: 1,
          revealed: 1,
          unrevealed: 0,
        },
      })),
    );
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData()}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reveal All' }));

    expect(vi.mocked(MutationConfigs.revealAllTickets)).toHaveBeenCalledWith('pbs-TICKETS');
    expect(screen.getByTestId('kuji-reveal-mobile-video')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Return' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Your Tickets' })).toHaveFocus();
    });
  });

  it('returns to the stable tickets page and shows an alert on reveal error', async () => {
    const user = userEvent.setup();

    vi.mocked(MutationConfigs.revealTicket).mockRejectedValue(new Error('reveal failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData()}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reveal ticket for Test Product 1' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Unable to reveal ticket');
    });

    expect(screen.queryByTestId('kuji-reveal-mobile-video')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal ticket for Test Product 1' })).toBeInTheDocument();
  });

  it('renders revealed tickets as shared prize tiles with the product-style detail dialog', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData({
          revealed: [
            createTicket({
              revealedAt: '2026-04-12T00:00:00.000Z',
              prize: {
                id: 'prize-1',
                prizeCode: 'A',
                name: 'Prize One',
                description: 'Prize dialog copy',
                imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
              },
            }),
          ],
          unrevealed: [],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getByRole('button', { name: /Prize One/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('Prize dialog copy');
    });

    expect(screen.getAllByText('Prize A').length).toBeGreaterThan(0);
  });
});
