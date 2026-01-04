/**
 * ticketPolicy
 * Owns: authorization decisions for Ticket actions ("can X do Y").
 * Does NOT own: identity resolution, persistence, HTTP, Stripe, UI.
 * Layer: Domain
 * Trust zone: none (caller supplies actor context)
 */

import type { Ticket } from '@/domain/ticket';
import type { UserId } from '@/domain/shared';
import { invariant } from '@/domain/shared';

/**
 * Domain-level actor representation for policy decisions.
 * This is intentionally smaller than your runtime auth system.
 * Policies should not know about cookies/Clerk/device tokens.
 */
export type PolicyActor =
  | { kind: 'user'; userId: UserId }
  | { kind: 'device'; userId: UserId } // acts on behalf of user
  | { kind: 'public' }; // possession-based access (publicId); identityless

export type TicketAction =
  | 'create'
  | 'view'
  | 'approve'
  | 'reject'
  | 'markPaid'
  | 'writePins';

/**
 * Central rule: ownership of a ticket belongs to ticket.userId.
 * Devices are treated as proxies for their bound user (same userId).
 * Public has restricted abilities (decide explicitly; default deny).
 */
export function can(
  actor: PolicyActor,
  action: TicketAction,
  ticket?: Ticket
): boolean {
  switch (action) {
    case 'create':
      return actor.kind === 'user' || actor.kind === 'device';

    case 'view': {
      if (!ticket) return false;
      // Users/devices can view their own tickets.
      if (actor.kind === 'user' || actor.kind === 'device')
        return actor.userId === ticket.userId;

      // Public view is possession-based and should be enforced at the edge by publicId routing.
      // Policy still returns true to allow "public portal" read once the correct ticket is fetched.
      return actor.kind === 'public';
    }

    case 'approve':
    case 'reject':
    case 'markPaid':
    case 'writePins': {
      if (!ticket) return false;

      // Default: only owner user/device
      if (actor.kind === 'user' || actor.kind === 'device')
        return actor.userId === ticket.userId;

      // Public can potentially act in client portal *if you explicitly allow it*.
      // For v2 safety: deny by default until you design the portal rules.
      return false;
    }

    default:
      return false;
  }
}

/**
 * Convenience helpers (callers ask, policy decides).
 * These are the functions routes/services should call, instead of ad-hoc checks.
 */
export const ticketPolicy = {
  canCreate(actor: PolicyActor) {
    return can(actor, 'create');
  },
  canView(actor: PolicyActor, ticket: Ticket) {
    return can(actor, 'view', ticket);
  },
  canApprove(actor: PolicyActor, ticket: Ticket) {
    return can(actor, 'approve', ticket);
  },
  canReject(actor: PolicyActor, ticket: Ticket) {
    return can(actor, 'reject', ticket);
  },
  canMarkPaid(actor: PolicyActor, ticket: Ticket) {
    return can(actor, 'markPaid', ticket);
  },
  canWritePins(actor: PolicyActor, ticket: Ticket) {
    return can(actor, 'writePins', ticket);
  },
};

/**
 * Optional assert-style helpers for “fail loudly”.
 * Use these in application services (preferred) or in routes (acceptable at edge),
 * but NEVER replace them with inline ownership checks.
 */
export function assertTicketAllowed(
  actor: PolicyActor,
  action: Exclude<TicketAction, 'create'>,
  ticket: Ticket
): void {
  invariant(
    ticketPolicyFor(action)(actor, ticket),
    `Forbidden: cannot ${action} this ticket.`
  );
}

function ticketPolicyFor(action: TicketAction) {
  switch (action) {
    case 'view':
      return ticketPolicy.canView;
    case 'approve':
      return ticketPolicy.canApprove;
    case 'reject':
      return ticketPolicy.canReject;
    case 'markPaid':
      return ticketPolicy.canMarkPaid;
    case 'writePins':
      return ticketPolicy.canWritePins;
    default:
      // create is handled elsewhere
      return () => false;
  }
}
