/**
 * shared/ids
 * Owns: domain ID branding + generators (pure).
 * Does NOT own: persistence, crypto security guarantees.
 * Layer: Domain
 * Trust zone: none
 */

export type Brand<K, T extends string> = K & { readonly __brand: T };

export type UserId = Brand<string, 'UserId'>; // Clerk userId
export type ClientId = Brand<string, 'ClientId'>; // internal
export type TicketId = Brand<string, 'TicketId'>; // internal
export type TicketPublicId = Brand<string, 'TicketPublicId'>; // URL token-ish

export function asUserId(id: string): UserId {
  if (!id || typeof id !== 'string') throw new Error('Invalid UserId');
  return id as UserId;
}

export function asClientId(id: string): ClientId {
  if (!id) throw new Error('Invalid ClientId');
  return id as ClientId;
}

export function asTicketId(id: string): TicketId {
  if (!id) throw new Error('Invalid TicketId');
  return id as TicketId;
}

export function asTicketPublicId(id: string): TicketPublicId {
  if (!id) throw new Error('Invalid TicketPublicId');
  return id as TicketPublicId;
}
