/**
 * ticket/types
 * Owns: Ticket (ChangeRequest) entity definition + lifecycle invariants.
 * Does NOT own: authorization decisions, persistence, Stripe implementation.
 * Layer: Domain
 * Trust zone: none
 */

import type {
  Cents,
  ClientId,
  IsoDateTime,
  TicketId,
  TicketPublicId,
  UserId,
} from '../shared';
import { invariant } from '../shared';

export type TicketStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export type Ticket = {
  id: TicketId; // internal id (never public)
  publicId: TicketPublicId; // url-safe secret for client portal
  userId: UserId; // freelancer owner
  clientId: ClientId;

  message: string; // frozen client request (verbatim)
  priceCents: Cents;

  status: TicketStatus;

  assetUrl: string | null;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export function createTicket(input: {
  id: TicketId;
  publicId: TicketPublicId;
  userId: UserId;
  clientId: ClientId;
  message: string;
  priceCents: Cents;
  assetUrl?: string | null;
  now: IsoDateTime;
}): Ticket {
  const msg = input.message.trim();

  invariant(msg.length > 0, 'Ticket message must be non-empty.');
  invariant(msg.length <= 2000, 'Ticket message too long.');

  return {
    id: input.id,
    publicId: input.publicId,
    userId: input.userId,
    clientId: input.clientId,
    message: msg,
    priceCents: input.priceCents,
    status: 'pending',
    assetUrl: input.assetUrl ?? null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

/**
 * Pure transition helpers (no persistence).
 * NOTE: business policy decides *who* can do this; domain enforces *what* is valid.
 */
export function approveTicket(ticket: Ticket, now: IsoDateTime): Ticket {
  invariant(
    ticket.status === 'pending',
    'Only pending tickets can be approved.'
  );
  return { ...ticket, status: 'approved', updatedAt: now };
}

export function rejectTicket(ticket: Ticket, now: IsoDateTime): Ticket {
  invariant(
    ticket.status === 'pending',
    'Only pending tickets can be rejected.'
  );
  return { ...ticket, status: 'rejected', updatedAt: now };
}

export function markTicketPaid(ticket: Ticket, now: IsoDateTime): Ticket {
  invariant(
    ticket.status === 'approved',
    'Only approved tickets can be marked paid.'
  );
  return { ...ticket, status: 'paid', updatedAt: now };
}
