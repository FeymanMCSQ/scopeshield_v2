// src/infra/repositories/deviceRepoPrisma.ts

import { prisma } from '@/infra/db/prisma';
import { hashToken } from '@/infra/crypto/tokens';

export class DeviceRepoPrisma {
  async create(params: {
    userId: string;
    rawToken: string;
    label?: string;
    userAgent?: string;
  }) {
    return prisma.device.create({
      data: {
        userId: params.userId,
        tokenHash: hashToken(params.rawToken),
        label: params.label,
        userAgent: params.userAgent,
      },
    });
  }

  async findByToken(rawToken: string) {
    return prisma.device.findUnique({
      where: {
        tokenHash: hashToken(rawToken),
      },
    });
  }

  async touch(deviceId: string) {
    return prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });
  }
}
