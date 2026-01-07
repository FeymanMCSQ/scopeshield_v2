/**
 * requireDeviceActor
 * Owns: strict device-token identity resolution for extension trust zone.
 * Does NOT own: Clerk, cookies, guest fallback.
 * Layer: Application-adjacent identity core
 * Trust zone: ext
 */

import { HttpError } from '@/server/http/httpError';
import { makeDeviceAuthService } from '@/server/services'; // adjust path if file is services.ts
import { asUserId } from '@/domain/shared';

export type DeviceActor = {
  kind: 'device';
  userId: string;
  deviceId: string;
};

export async function requireDeviceActor(req: Request): Promise<DeviceActor> {
  const authz = req.headers.get('authorization') ?? '';
  const token = parseBearer(authz);

  if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'Missing device token.');

  const res = await makeDeviceAuthService().authenticateDeviceToken(token);
  if (!res) throw new HttpError(401, 'UNAUTHORIZED', 'Invalid device token.');

  return {
    kind: 'device',
    userId: asUserId(res.userId),
    deviceId: res.deviceId,
  };
}

function parseBearer(value: string): string | null {
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}
