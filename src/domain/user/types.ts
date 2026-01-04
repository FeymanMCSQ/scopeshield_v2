/**
 * user/types
 * Owns: User entity definition.
 * Does NOT own: authentication/session (Clerk), persistence.
 * Layer: Domain
 * Trust zone: none
 */

import type { IsoDateTime, UserId } from '../shared';

export type User = {
  id: UserId; // Clerk userId
  email: string | null;
  createdAt: IsoDateTime;
};
