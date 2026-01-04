/**
 * shared/time
 * Owns: time primitives used by domain.
 * Does NOT own: clocks (injected later).
 * Layer: Domain
 * Trust zone: none
 */

export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };

export function isoDateTime(s: string): IsoDateTime {
  // Intentionally light validation (domain shouldn't parse like a librarian).
  if (!s) throw new Error('Invalid IsoDateTime');
  return s as IsoDateTime;
}
