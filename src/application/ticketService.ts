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

// src/application/ticketService.ts
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
import { rejectTicket as rejectDomain } from '@/domain/ticket';

/** Dependencies (ports) — implemented by Infrastructure later (Prisma repos). */

export type DashboardTicket = {
  id: TicketId;
  publicId: TicketPublicId;
  status: Ticket['status'];
  message: string;
  priceCents: Cents;
  assetUrl: string | null;
  createdAt: IsoDateTime;

  client: {
    id: ClientId;
    name: string;
  };
};

export interface TicketRepo {
  findById(id: TicketId): Promise<Ticket | null>;
  findByPublicId(publicId: TicketPublicId): Promise<Ticket | null>;
  create(ticket: Ticket): Promise<Ticket>;
  update(ticket: Ticket): Promise<Ticket>;

  findForDashboard(userId: UserId): Promise<DashboardTicket[]>;
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
   * approveTicketAsUser
   * Workflow: load → authorize ownership → transition → persist.
   *
   * Trust boundary: caller supplies userId (web/device/etc). Service enforces ownership.
   */
  async approveTicketAsUser(
    userId: UserId,
    ticketId: TicketId
  ): Promise<Ticket> {
    invariant(userId, 'userId is required.');
    const ticket = await this.mustGet(ticketId);

    if (ticket.userId !== userId) {
      throw new DomainError('FORBIDDEN', 'You do not own this ticket.');
    }

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
    console.log('[TICKETS] markPaid ticketId =', ticketId);
    const ticket = await this.mustGet(ticketId);
    const now = this.deps.time.now();

    const next = markPaidDomain(ticket, now);
    return this.deps.ticketRepo.update(next);
  }

  async getDashboard(userId: UserId): Promise<DashboardTicket[]> {
    invariant(userId, 'userId is required.');
    return this.deps.ticketRepo.findForDashboard(userId);
  }

  async getPublicTicket(publicId: TicketPublicId): Promise<Ticket> {
    invariant(publicId, 'publicId is required.');
    const ticket = await this.deps.ticketRepo.findByPublicId(publicId);
    if (!ticket) throw new DomainError('NOT_FOUND', 'Ticket not found.');
    return ticket;
  }

  async rejectTicket(ticketId: TicketId): Promise<Ticket> {
    const ticket = await this.mustGet(ticketId);
    const now = this.deps.time.now();

    const next = rejectDomain(ticket, now);
    return this.deps.ticketRepo.update(next);
  }

  private async mustGet(id: TicketId): Promise<Ticket> {
    const ticket = await this.deps.ticketRepo.findById(id);
    if (!ticket) throw new DomainError('NOT_FOUND', 'Ticket not found.');
    return ticket;
  }
}
