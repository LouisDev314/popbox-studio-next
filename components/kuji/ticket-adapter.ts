import type { IAccountOrderTicket, INormalizedTicket } from '@/interfaces/account';
import type { IGuestTicketView, IOrderTicket } from '@/interfaces/order';

export function normalizeAccountTicket(ticket: IAccountOrderTicket): INormalizedTicket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    createdAt: ticket.createdAt,
    revealedAt: ticket.revealedAt,
    voidedAt: ticket.voidedAt,
    voidReason: ticket.voidReason,
    product: ticket.product,
    prize: ticket.revealedAt ? ticket.prize : null,
  };
}

export function normalizeRawOrderTicket(ticket: IOrderTicket): INormalizedTicket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    createdAt: ticket.createdAt,
    revealedAt: ticket.revealedAt,
    voidedAt: ticket.voidedAt,
    voidReason: ticket.voidReason,
    product: {
      productId: ticket.kujiProduct.id,
      name: ticket.kujiProduct.name,
      slug: ticket.kujiProduct.slug,
      imageUrl: ticket.kujiProduct.imageUrl,
      imageAltText: ticket.kujiProduct.imageAltText,
    },
    prize: ticket.revealedAt && ticket.prize ? {
      prizeCode: ticket.prize.prizeCode,
      name: ticket.prize.name,
      description: ticket.prize.description,
      imageUrl: ticket.prize.imageUrl,
      prizeTier: ticket.prize.prizeTier,
    } : null,
  };
}

export function normalizeRawTicketView(view: IGuestTicketView): INormalizedTicket[] {
  return view.tickets.map(normalizeRawOrderTicket);
}
