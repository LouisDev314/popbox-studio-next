/* eslint-disable @next/next/no-img-element */

import { type ImgHTMLAttributes } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosHeaders, HttpStatusCode, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  } as IOrderTicket;
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
    config: { headers: new AxiosHeaders() },
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
  beforeEach(() => {
    vi.mocked(MutationConfigs.revealAllTickets).mockReset();
    vi.mocked(MutationConfigs.revealTicket).mockReset();
    vi.mocked(QueryConfigs.fetchGuestTickets).mockReset();
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts single reveal immediately and opens the video overlay', async () => {
    const user = userEvent.setup();
    const revealTicket = vi.mocked(MutationConfigs.revealTicket);

    revealTicket.mockResolvedValue(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          prizeTier: 'F',
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
    expect(screen.getByTestId('kuji-reveal-video')).toBeInTheDocument();
  });

  it('does not duplicate reveal API calls when the reveal button is clicked repeatedly', async () => {
    const user = userEvent.setup();
    const revealTicket = vi.mocked(MutationConfigs.revealTicket);
    const deferredReveal = createDeferred<AxiosResponse<IBaseApiResponse<IOrderTicket>>>();

    revealTicket.mockReturnValue(deferredReveal.promise);
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData()}
        publicId="pbs-TICKETS"
      />,
    );

    const revealButton = screen.getByRole('button', { name: 'Reveal ticket for Test Product 1' });

    await user.click(revealButton);
    fireEvent.click(revealButton);

    expect(revealTicket).toHaveBeenCalledTimes(1);
    expect(revealTicket).toHaveBeenCalledWith({
      publicId: 'pbs-TICKETS',
      ticketId: 'ticket-1',
    });
  });

  it('keeps leaked prize data inside its grouped product section and still starts the reveal flow', async () => {
    const user = userEvent.setup();
    const revealTicket = vi.mocked(MutationConfigs.revealTicket);
    const leakedPrizeTicket = createTicket({
      prize: {
        id: 'prize-1',
        prizeCode: 'F',
        prizeTier: 'F',
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

    expect(screen.getByRole('heading', { name: 'Test Product 1' })).toBeInTheDocument();
    expect(screen.getByText('1 awaiting reveal')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Prize One' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[0]);

    expect(revealTicket).toHaveBeenCalledWith({
      publicId: 'pbs-TICKETS',
      ticketId: 'ticket-1',
    });
    expect(screen.getByTestId('kuji-reveal-video')).toBeInTheDocument();
  });

  it('keeps the overlay mounted until both the video and API are complete', async () => {
    const user = userEvent.setup();
    const deferredReveal = createDeferred<AxiosResponse<IBaseApiResponse<IOrderTicket>>>();
    const secondTicket = createTicket({
      id: 'ticket-2',
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

    expect(screen.getByTestId('kuji-reveal-video')).toBeInTheDocument();

    fireEvent.ended(screen.getByTestId('kuji-reveal-video'));

    await waitFor(() => {
      expect(screen.getByText('Preparing your result')).toBeInTheDocument();
    });

    deferredReveal.resolve(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          prizeTier: 'F',
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

    expect(screen.getByRole('button', { name: 'Reveal Next' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to tickets' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prize One' })).toBeInTheDocument();
  });

  it('degrades gracefully to the result when reveal video playback fails', async () => {
    vi
      .mocked(HTMLMediaElement.prototype.play)
      .mockReturnValue(Promise.reject(new DOMException('Playback blocked', 'NotAllowedError')));

    vi.mocked(MutationConfigs.revealTicket).mockResolvedValue(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          prizeTier: 'F',
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

    fireEvent.click(screen.getByRole('button', { name: 'Reveal ticket for Test Product 1' }));

    expect(screen.getByTestId('kuji-reveal-video')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Congratulations')).toBeInTheDocument();
    });

    const prizeImages = screen.getAllByRole('img', { name: 'Prize One' });

    expect(prizeImages.length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('storefront-image-skeleton').length).toBeGreaterThan(0);
  });

  it('allows skipping the single reveal video and still advances into the result flow', async () => {
    const user = userEvent.setup();

    vi.mocked(MutationConfigs.revealTicket).mockResolvedValue(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          prizeTier: 'F',
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
          unrevealed: [createTicket(), createTicket({ id: 'ticket-2' })],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[0]);
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => {
      expect(screen.getByText('Congratulations')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Reveal Next' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prize One' })).toBeInTheDocument();
  });

  it('shows the single result and advances to a remaining earlier ticket when a later ticket is revealed first', async () => {
    const user = userEvent.setup();
    const ticketOne = createTicket({ id: 'ticket-1' });
    const ticketTwo = createTicket({ id: 'ticket-2' });
    const ticketThree = createTicket({ id: 'ticket-3' });

    vi.mocked(MutationConfigs.revealTicket)
      .mockResolvedValueOnce(
        createApiResponse({
          ...ticketTwo,
          prize: {
            id: 'prize-2',
            prizeCode: 'G',
            prizeTier: 'G',
            name: 'Prize Two',
            description: null,
            imageUrl: 'https://cdn.example.com/prizes/prize-two.jpg',
          },
          revealedAt: '2026-04-12T00:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        createApiResponse({
          ...ticketThree,
          prize: {
            id: 'prize-3',
            prizeCode: 'H',
            prizeTier: 'H',
            name: 'Prize Three',
            description: null,
            imageUrl: 'https://cdn.example.com/prizes/prize-three.jpg',
          },
          revealedAt: '2026-04-12T00:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(
        createApiResponse({
          ...ticketOne,
          prize: {
            id: 'prize-1',
            prizeCode: 'C',
            prizeTier: 'C',
            name: 'Prize One',
            description: null,
            imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
          },
          revealedAt: '2026-04-12T00:00:00.000Z',
        }),
      );
    vi.mocked(QueryConfigs.fetchGuestTickets).mockRejectedValue(new Error('refresh failed'));

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData({
          unrevealed: [ticketOne, ticketTwo, ticketThree],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Reveal ticket for Test Product 1' })[1]);

    expect(vi.mocked(MutationConfigs.revealTicket)).toHaveBeenNthCalledWith(1, {
      publicId: 'pbs-TICKETS',
      ticketId: 'ticket-2',
    });

    fireEvent.ended(screen.getByTestId('kuji-reveal-video'));

    await waitFor(() => {
      expect(screen.getByText('Ticket 1 / 3')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Reveal Next' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prize Two' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal Next' }));

    await waitFor(() => {
      expect(vi.mocked(MutationConfigs.revealTicket)).toHaveBeenNthCalledWith(2, {
        publicId: 'pbs-TICKETS',
        ticketId: 'ticket-3',
      });
    });

    fireEvent.ended(screen.getByTestId('kuji-reveal-video'));

    await waitFor(() => {
      expect(screen.getByText('Ticket 2 / 3')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reveal Next' }));

    await waitFor(() => {
      expect(vi.mocked(MutationConfigs.revealTicket)).toHaveBeenNthCalledWith(3, {
        publicId: 'pbs-TICKETS',
        ticketId: 'ticket-1',
      });
    });

    fireEvent.ended(screen.getByTestId('kuji-reveal-video'));

    await waitFor(() => {
      expect(screen.getByText('Ticket 3 / 3')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prize One' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View Results' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    });

    expect(screen.getAllByText('Prize One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prize Two').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Prize Three').length).toBeGreaterThan(0);
  });

  it('shows the single result before the final summary after a single-ticket reveal completes', async () => {
    const user = userEvent.setup();

    vi.mocked(MutationConfigs.revealTicket).mockResolvedValue(
      createApiResponse(createTicket({
        prize: {
          id: 'prize-1',
          prizeCode: 'F',
          prizeTier: 'F',
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

    await user.click(screen.getByRole('button', { name: 'Reveal ticket for Test Product 1' }));
    fireEvent.ended(screen.getByTestId('kuji-reveal-video'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Reveal Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prize One' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View Results' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    });

    expect(screen.getAllByText('Prize One').length).toBeGreaterThan(0);
  });

  it('advances in unrevealed order and shows the final single reveal before the summary overlay', async () => {
    const user = userEvent.setup();
    const ticketOne = createTicket({ id: 'ticket-1' });
    const ticketTwo = createTicket({
      id: 'ticket-2',
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
            prizeTier: 'C',
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
            prizeTier: 'G',
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
    fireEvent.ended(screen.getByTestId('kuji-reveal-video'));

    await waitFor(() => {
      expect(screen.getByText('Ticket 1 / 2')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reveal Next' }));

    await waitFor(() => {
      expect(vi.mocked(MutationConfigs.revealTicket)).toHaveBeenNthCalledWith(2, {
        publicId: 'pbs-TICKETS',
        ticketId: 'ticket-2',
      });
    });

    fireEvent.ended(screen.getByTestId('kuji-reveal-video'));

    await waitFor(() => {
      expect(screen.getByText('Ticket 2 / 2')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Prize Two' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View Results' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    });

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
            kujiProduct: {
              id: 'product-1',
              name: 'Ichiban Kuji Moonlight Parade',
              slug: 'moonlight-parade',
              imageUrl: 'https://cdn.example.com/products/test-product-1.jpg',
              imageAltText: 'Ichiban Kuji Moonlight Parade',
            },
            prize: {
              id: 'prize-1',
              prizeCode: 'A',
              prizeTier: 'A',
              name: 'Prize One',
              description: 'Overlay prize dialog copy',
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
    expect(screen.getByTestId('kuji-reveal-video')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
    });

    const revealOverlay = screen.getByRole('dialog', { name: 'Ticket reveal overlay' });

    expect(within(revealOverlay).getByText('Ichiban Kuji Moonlight Parade')).toBeInTheDocument();
    const summaryPrizeTile = within(revealOverlay).getByRole('article');

    expect(summaryPrizeTile).toHaveClass('rounded-[1.15rem]');
    expect(within(summaryPrizeTile).getByText('Prize One')).toBeInTheDocument();

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

    expect(screen.queryByTestId('kuji-reveal-video')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal ticket for Test Product 1' })).toBeInTheDocument();
  });

  it('renders grouped sections in stable product order without redundant product text on child tiles', async () => {
    const user = userEvent.setup();
    const moonlightUnrevealed = createTicket({
      id: 'ticket-1',
      kujiProduct: {
        id: 'product-1',
        name: 'Ichiban Kuji Moonlight Parade',
        slug: 'moonlight-parade',
        imageUrl: 'https://cdn.example.com/products/test-product-1.jpg',
        imageAltText: 'Ichiban Kuji Moonlight Parade',
      },
    });
    const moonlightRevealed = createTicket({
      id: 'ticket-2',
      revealedAt: '2026-04-12T00:00:00.000Z',
      kujiProduct: {
        id: 'product-1',
        name: 'Ichiban Kuji Moonlight Parade',
        slug: 'moonlight-parade',
        imageUrl: 'https://cdn.example.com/products/test-product-1.jpg',
        imageAltText: 'Ichiban Kuji Moonlight Parade',
      },
      prize: {
        id: 'prize-1',
        prizeCode: 'A',
        prizeTier: 'A',
        name: 'Prize One',
        description: 'Prize dialog copy',
        imageUrl: 'https://cdn.example.com/prizes/prize-one.jpg',
      },
    });
    const starlightUnrevealed = createTicket({
      id: 'ticket-3',
      kujiProduct: {
        id: 'product-2',
        name: 'Ichiban Kuji Starlight Waltz',
        slug: 'starlight-waltz',
        imageUrl: 'https://cdn.example.com/products/test-product-2.jpg',
        imageAltText: 'Ichiban Kuji Starlight Waltz',
      },
    });

    renderWithProviders(
      <OrderTicketsPageClient
        initialViewData={createViewData({
          tickets: [moonlightUnrevealed, moonlightRevealed, starlightUnrevealed],
          revealed: [moonlightRevealed],
          unrevealed: [moonlightUnrevealed, starlightUnrevealed],
        })}
        publicId="pbs-TICKETS"
      />,
    );

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

    expect(headings).toEqual(['Ichiban Kuji Moonlight Parade', 'Ichiban Kuji Starlight Waltz']);
    expect(screen.getByText('1 awaiting reveal • 1 revealed')).toBeInTheDocument();
    expect(screen.getByText('1 awaiting reveal')).toBeInTheDocument();

    const moonlightSection = screen.getByTestId('ticket-group-product-1');
    const starlightSection = screen.getByTestId('ticket-group-product-2');

    expect(moonlightSection.className).not.toContain('bg-card');
    expect(moonlightSection.className).not.toContain('border');
    expect(moonlightSection.className).not.toContain('rounded');
    expect(starlightSection.className).not.toContain('bg-card');
    expect(within(moonlightSection).getByText('Tap to reveal')).toBeInTheDocument();
    expect(within(moonlightSection).getByRole('button', { name: /Prize One/i })).toBeInTheDocument();
    expect(within(moonlightSection).queryAllByText('Ichiban Kuji Moonlight Parade')).toHaveLength(1);
    expect(screen.queryByText(/Ticket\s*\d+/i)).not.toBeInTheDocument();

    const revealedPrizeTile = screen.getByRole('button', { name: /Prize One/i });

    expect(revealedPrizeTile).toHaveClass('rounded-[1.15rem]');

    await user.click(revealedPrizeTile);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent('Prize dialog copy');
    });

    expect(screen.getAllByText('Prize A').length).toBeGreaterThan(0);
  });
});
