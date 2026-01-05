/**
 * server/providers
 * Owns: boring runtime providers (ids/time).
 * Does NOT own: business logic.
 * Layer: Application
 * Trust zone: none
 */

import crypto from 'crypto';
import { asTicketId, asTicketPublicId, isoDateTime } from '@/domain/shared';

export const ids = {
  newTicketId: () => asTicketId(crypto.randomUUID()),
  newTicketPublicId: () => asTicketPublicId(crypto.randomUUID()),
};

export const time = {
  now: () => isoDateTime(new Date().toISOString()),
};
