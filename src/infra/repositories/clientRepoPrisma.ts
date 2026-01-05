import { prisma } from '@/infra/db/prisma';
import type { Client } from '@/domain/client';
import type { ClientId, UserId } from '@/domain/shared';
import { asClientId, asUserId, isoDateTime } from '@/domain/shared';
import type { Client as PrismaClient } from '../../generated/prisma/client';

function toDomain(row: PrismaClient): Client {
  return {
    id: asClientId(row.id),
    userId: asUserId(row.userId),
    name: row.name,
    createdAt: isoDateTime(row.createdAt.toISOString()),
  };
}

export interface ClientRepo {
  create(client: Client): Promise<Client>;
  findById(id: ClientId): Promise<Client | null>;
}

export class ClientRepoPrisma implements ClientRepo {
  async create(client: Client): Promise<Client> {
    const row = await prisma.client.create({
      data: {
        id: client.id,
        userId: client.userId,
        name: client.name,
      },
    });
    return toDomain(row);
  }

  async findById(id: ClientId): Promise<Client | null> {
    const row = await prisma.client.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
