import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketRevealCard } from '@/components/kuji/ticket-reveal-card';
import type { IOrderTicket } from '@/interfaces/order';

function createTicket(overrides: Partial<IOrderTicket> = {}): IOrderTicket {
  return {
    id: 'ticket-1',
    revealedAt: '2026-04-12T00:00:00.000Z',
    voidedAt: null,
    voidReason: null,
    prize: {
      id: 'prize-1',
      prizeCode: 'B1',
      prizeTier: 'B',
      name: 'Grand Figure',
      description: 'This is prize a for testing',
      imageUrl: 'https://cdn.example.com/prizes/grand-figure.jpg',
    },
    kujiProduct: {
      id: 'product-1',
      name: 'Test Product 2',
      slug: 'test-product-2',
      imageUrl: 'https://cdn.example.com/products/test-product-2.jpg',
      imageAltText: 'Test Product 2',
    },
    createdAt: '2026-04-12T00:00:00.000Z',
    ...overrides,
  } as IOrderTicket;
}

describe('TicketRevealCard', () => {
  it('renders the revealed prize result inside the shared ticket layout', () => {
    const { container } = render(
      <TicketRevealCard
        ticket={createTicket()}
        onReveal={() => {}}
        isRevealing={false}
      />,
    );

    const ticketRoot = container.firstElementChild;

    expect(ticketRoot).toHaveAttribute('data-ticket-shape', 'kuji-ticket');
    expect(ticketRoot).toHaveAttribute('data-ticket-state', 'revealed');
    expect(ticketRoot).toHaveClass('aspect-[1200/615]');
    expect(screen.getByText((content, node) => {
      return content === 'Prize B' && node?.tagName === 'P';
    })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Grand Figure' })).toBeInTheDocument();
    expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal ticket for Test Product 2' })).not.toBeInTheDocument();
  });

  it('omits the description block when the prize description is not provided', () => {
    render(
      <TicketRevealCard
        ticket={createTicket({
          prize: {
            id: 'prize-1',
            prizeCode: 'B1',
            prizeTier: 'B',
            name: 'Grand Figure',
            description: null,
            imageUrl: 'https://cdn.example.com/prizes/grand-figure.jpg',
          },
        })}
        onReveal={() => {}}
        isRevealing={false}
      />,
    );

    expect(screen.queryByText('This is prize a for testing')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Grand Figure' })).toBeInTheDocument();
  });

  it('renders the unrevealed ticket face without repeated product or ticket text', () => {
    render(
      <TicketRevealCard
        ticket={createTicket({
          revealedAt: null,
          prize: null,
        })}
        onReveal={() => {}}
        isRevealing={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Reveal ticket for Test Product 2' })).toBeInTheDocument();
    expect(screen.getAllByTestId('ticket-image-skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Test Product 2' })).not.toBeInTheDocument();
    expect(screen.queryByAltText('Test Product 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ticket\s*\d+/i)).not.toBeInTheDocument();
    expect(screen.getByText('Tap to reveal')).toBeInTheDocument();
  });

  it('keeps the unrevealed interaction behavior unchanged and calls onReveal', async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();

    render(
      <TicketRevealCard
        ticket={createTicket({
          revealedAt: null,
          prize: null,
        })}
        onReveal={onReveal}
        isRevealing={false}
      />,
    );

    expect(screen.getByText('Tap to reveal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal ticket for Test Product 2' }));

    expect(onReveal).toHaveBeenCalledWith('ticket-1', expect.any(HTMLButtonElement));
  });

  it('treats leaked prize data as unrevealed when revealedAt is missing', async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    const { container } = render(
      <TicketRevealCard
        ticket={createTicket({
          revealedAt: null,
        })}
        onReveal={onReveal}
        isRevealing={false}
      />,
    );

    const ticketRoot = container.firstElementChild;

    expect(ticketRoot).toHaveAttribute('data-ticket-state', 'unrevealed');
    expect(screen.getByRole('button', { name: 'Reveal ticket for Test Product 2' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Grand Figure' })).not.toBeInTheDocument();
    expect(screen.queryByText('Test Product 2')).not.toBeInTheDocument();
    expect(screen.getByText('Tap to reveal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal ticket for Test Product 2' }));

    expect(onReveal).toHaveBeenCalledWith('ticket-1', expect.any(HTMLButtonElement));
  });

  it('keeps the unrevealed ticket keyboard accessible', async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();

    render(
      <TicketRevealCard
        ticket={createTicket({
          revealedAt: null,
          prize: null,
        })}
        onReveal={onReveal}
        isRevealing={false}
      />,
    );

    const revealTicketButton = screen.getByRole('button', { name: 'Reveal ticket for Test Product 2' });
    revealTicketButton.focus();

    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onReveal).toHaveBeenCalledTimes(2);
    expect(onReveal).toHaveBeenNthCalledWith(1, 'ticket-1', expect.any(HTMLButtonElement));
    expect(onReveal).toHaveBeenNthCalledWith(2, 'ticket-1', expect.any(HTMLButtonElement));
  });
});
