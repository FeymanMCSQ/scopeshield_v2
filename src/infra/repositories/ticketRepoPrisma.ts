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
import type { DashboardTicket } from '@/application/ticketService';

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

  async findForDashboard(userId: Ticket['userId']): Promise<DashboardTicket[]> {
    const rows = (await prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
      },
    })) as unknown as (PrismaTicket & { client: { id: string; name: string } })[];

    return rows.map((row) => ({
      id: asTicketId(row.id),
      publicId: asTicketPublicId(row.publicId),
      status: row.status as Ticket['status'],
      message: row.message,
      priceCents: cents(row.priceCents),
      assetUrl: row.assetUrl ?? null,
      createdAt: isoDateTime(row.createdAt.toISOString()),
      client: {
        id: asClientId(row.client.id),
        name: row.client.name,
      },
    }));
  }
}
