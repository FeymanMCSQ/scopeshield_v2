/**
 * client/types
 * Owns: Client entity definition.
 * Does NOT own: persistence or UI concerns.
 * Layer: Domain
 * Trust zone: none
 */

// src/domain/client/types.ts
import type { ClientId, IsoDateTime, UserId } from '../shared';
import { invariant } from '../shared';

export type Client = {
  id: ClientId;
  userId: UserId; // owner (freelancer)
  name: string;
  createdAt: IsoDateTime;
};

export function createClient(input: {
  id: ClientId;
  userId: UserId;
  name: string;
  createdAt: IsoDateTime;
}): Client {
  invariant(input.name.trim().length > 0, 'Client name must be non-empty.');
  invariant(input.name.trim().length <= 80, 'Client name too long.');
  return {
    id: input.id,
    userId: input.userId,
    name: input.name.trim(),
    createdAt: input.createdAt,
  };
}
