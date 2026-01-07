// src/infra/repositories/pairingTokenRepoPrisma.ts

import { prisma } from '@/infra/db/prisma';
import { hashToken } from '@/infra/crypto/tokens';

export class PairingTokenRepoPrisma {
  async create(userId: string, rawToken: string, expiresAt: Date) {
    return prisma.pairingToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });
  }

  async consume(rawToken: string) {
    const tokenHash = hashToken(rawToken);

    return prisma.$transaction(async (tx) => {
      const record = await tx.pairingToken.findUnique({
        where: { tokenHash },
      });

      if (!record) return null;
      if (record.usedAt) return null;
      if (record.expiresAt < new Date()) return null;

      await tx.pairingToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      return record;
    });
  }
}
