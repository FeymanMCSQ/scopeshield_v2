/**
 * DeviceAuthService
 * Owns: verifying a device token and resolving it to a canonical (userId, deviceId).
 * Does NOT own: HTTP parsing, Clerk, cookies, Prisma.
 * Layer: Application
 * Trust zone: none
 */

import { DomainError, invariant } from '@/domain/shared';

export interface DeviceRepo {
  findByToken(
    rawToken: string
  ): Promise<null | { id: string; userId: string; revokedAt: Date | null }>;
  touch(deviceId: string): Promise<unknown>;
}

export class DeviceAuthService {
  constructor(private readonly deps: { deviceRepo: DeviceRepo }) {}

  async authenticateDeviceToken(
    rawToken: string
  ): Promise<null | { deviceId: string; userId: string }> {
    invariant(rawToken, 'device token is required.');

    const device = await this.deps.deviceRepo.findByToken(rawToken);
    if (!device) return null;
    if (device.revokedAt) return null;

    // nice-to-have: update lastSeenAt (non-critical)
    try {
      await this.deps.deviceRepo.touch(device.id);
    } catch {
      // don't fail auth if touch fails
    }

    return { deviceId: device.id, userId: device.userId };
  }
}
