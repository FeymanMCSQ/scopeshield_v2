/**
 * PairingService
 * Owns: pairing workflow (mint pairing code, exchange for device token).
 * Does NOT own: Prisma, hashing, Stripe, Clerk, HTTP parsing.
 * Layer: Application
 * Trust zone: none
 */

import crypto from 'crypto';
import { DomainError } from '@/domain/shared';

export interface PairingTokenRepo {
  create(userId: string, rawToken: string, expiresAt: Date): Promise<unknown>;
  consume(rawToken: string): Promise<null | { userId: string }>;
}

export interface DeviceRepo {
  create(params: {
    userId: string;
    rawToken: string;
    label?: string;
    userAgent?: string;
  }): Promise<{ id: string; userId: string }>;

  findByToken(
    rawToken: string
  ): Promise<null | { id: string; userId: string; revokedAt: Date | null }>;
  touch(deviceId: string): Promise<unknown>;
}

export class PairingService {
  private static PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly deps: {
      pairingTokenRepo: PairingTokenRepo;
      deviceRepo: DeviceRepo;
    }
  ) {}

  async startPairing(input: {
    userId: string;
  }): Promise<{ pairingCode: string; expiresAt: Date }> {
    const pairingCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PairingService.PAIRING_TTL_MS);

    await this.deps.pairingTokenRepo.create(
      input.userId,
      pairingCode,
      expiresAt
    );

    return { pairingCode, expiresAt };
  }

  async completePairing(input: {
    pairingCode: string;
    deviceMeta?: { label?: string; userAgent?: string };
  }): Promise<{ deviceToken: string; userId: string; deviceId: string }> {
    const record = await this.deps.pairingTokenRepo.consume(input.pairingCode);
    if (!record) {
      // consume() already covers: not found, used, expired
      throw new DomainError('NOT_FOUND', 'Invalid or expired pairing code.');
    }

    const deviceToken = crypto.randomBytes(32).toString('hex');

    const device = await this.deps.deviceRepo.create({
      userId: record.userId,
      rawToken: deviceToken,
      label: input.deviceMeta?.label,
      userAgent: input.deviceMeta?.userAgent,
    });

    return { deviceToken, userId: record.userId, deviceId: device.id };
  }
}
