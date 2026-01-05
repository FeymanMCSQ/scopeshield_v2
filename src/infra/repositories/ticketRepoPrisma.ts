/**
 * TicketRepoPrisma
 * Owns: Ticket persistence via Prisma.
 * Does NOT own: authorization, workflows, HTTP.
 * Layer: Infrastructure
 * Trust zone: none
 */

// src/infra/repositories/ticketRepoPrisma.ts
import { prisma } from '@/infra/db/prisma';
import type { TicketRepo } from '@/application/ticketService';
import type { Ticket } from '@/domain/ticket';
import {
  isoDateTime,
  asClientId,
  asTicketId,
  asTicketPublicId,
  asUserId,
  cents,
} from '@/domain/shared';
import type { Ticket as PrismaTicket } from '../../generated/prisma/client';

function toDomain(row: PrismaTicket): Ticket {
  return {
    id: asTicketId(row.id),
    publicId: asTicketPublicId(row.publicId),
    userId: asUserId(row.userId),
    clientId: asClientId(row.clientId),
    message: row.message,
    priceCents: cents(row.priceCents),
    status: row.status as Ticket['status'], // (or tighten with enum later)
    assetUrl: row.assetUrl ?? null,
    createdAt: isoDateTime(row.createdAt.toISOString()),
    updatedAt: isoDateTime(row.updatedAt.toISOString()),
  };
}

export class TicketRepoPrisma implements TicketRepo {
  async findById(id: Ticket['id']): Promise<Ticket | null> {
    const row = await prisma.ticket.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(ticket: Ticket): Promise<Ticket> {
    const row = await prisma.ticket.create({
      data: {
        id: ticket.id,
        publicId: ticket.publicId,
        userId: ticket.userId,
        clientId: ticket.clientId,
        message: ticket.message,
        priceCents: ticket.priceCents,
        status: ticket.status,
        assetUrl: ticket.assetUrl,
      },
    });
    return toDomain(row);
  }

  async update(ticket: Ticket): Promise<Ticket> {
    const row = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status,
        assetUrl: ticket.assetUrl,
      },
    });
    return toDomain(row);
  }
}
