/**
 * TicketService
 * Owns: ticket lifecycle use-cases (create, approve, markPaid).
 * Does NOT own: HTTP parsing, cookies, auth providers, Stripe, UI, Prisma.
 * Layer: Application
 * Trust zone: none (caller supplies identity context)
 *
 * Notes:
 * - Authorization decisions should live in domain policy modules later.
 * - This service is intentionally "transport-agnostic" and "payment-agnostic".
 */

import type {
  ClientId,
  TicketId,
  TicketPublicId,
  UserId,
  IsoDateTime,
  Cents,
} from '@/domain/shared';
import type { Ticket } from '@/domain/ticket';
import {
  createTicket as createTicketDomain,
  approveTicket as approveDomain,
  markTicketPaid as markPaidDomain,
} from '@/domain/ticket';
import { DomainError, invariant } from '@/domain/shared';

/** Dependencies (ports) — implemented by Infrastructure later (Prisma repos). */
export interface TicketRepo {
  findById(id: TicketId): Promise<Ticket | null>;
  create(ticket: Ticket): Promise<Ticket>;
  update(ticket: Ticket): Promise<Ticket>;
}

export interface IdProvider {
  newTicketId(): TicketId;
  newTicketPublicId(): TicketPublicId;
}

export interface TimeProvider {
  now(): IsoDateTime;
}

/** Inputs */
export type CreateTicketInput = {
  userId: UserId;
  clientId: ClientId;
  message: string;
  priceCents: Cents;
  assetUrl?: string | null;
};

export class TicketService {
  constructor(
    private readonly deps: {
      ticketRepo: TicketRepo;
      ids: IdProvider;
      time: TimeProvider;
    }
  ) {}

  /**
   * createTicket
   * Workflow: construct a new Ticket in "pending" state and persist it.
   * No HTTP. No cookies. No Stripe. No UI.
   */
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    invariant(input.userId, 'userId is required.');
    invariant(input.clientId, 'clientId is required.');

    const now = this.deps.time.now();

    const ticket = createTicketDomain({
      id: this.deps.ids.newTicketId(),
      publicId: this.deps.ids.newTicketPublicId(),
      userId: input.userId,
      clientId: input.clientId,
      message: input.message,
      priceCents: input.priceCents,
      assetUrl: input.assetUrl ?? null,
      now,
    });

    return this.deps.ticketRepo.create(ticket);
  }

  /**
   * approveTicket
   * Workflow: load → transition → persist.
   */
  async approveTicket(ticketId: TicketId): Promise<Ticket> {
    const ticket = await this.mustGet(ticketId);
    const now = this.deps.time.now();

    const next = approveDomain(ticket, now);
    return this.deps.ticketRepo.update(next);
  }

  /**
   * markPaid
   * Workflow: load → transition → persist.
   *
   * Payment provider integration (Stripe webhooks/checkout) happens OUTSIDE:
   * caller decides when payment is confirmed, then calls markPaid().
   */
  async markPaid(ticketId: TicketId): Promise<Ticket> {
    const ticket = await this.mustGet(ticketId);
    const now = this.deps.time.now();

    const next = markPaidDomain(ticket, now);
    return this.deps.ticketRepo.update(next);
  }

  private async mustGet(id: TicketId): Promise<Ticket> {
    const ticket = await this.deps.ticketRepo.findById(id);
    if (!ticket) throw new DomainError('NOT_FOUND', 'Ticket not found.');
    return ticket;
  }
}
