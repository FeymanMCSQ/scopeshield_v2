/**
 * shared/money
 * Owns: money primitives (cents) and safe constructors.
 * Does NOT own: pricing policy.
 * Layer: Domain
 * Trust zone: none
 */

export type Cents = number & { readonly __brand: 'Cents' };

export function cents(n: number): Cents {
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid cents: ${n}`);
  return n as Cents;
}
