/**
 * getActor
 * Owns: canonical identity resolution for the Web trust zone (user or guest).
 * Does NOT own: authorization decisions, business workflows, persistence, request parsing.
 * Layer: Application (identity core)
 * Trust zone: web
 *
 * Rules enforced:
 * - Calls auth() first (canonical user identity)
 * - Falls back to guest only if unauthenticated
 * - Never guesses (no alternative identity sources)
 * - Never silently downgrades (use requireUserActor / requireGuestActor)
 */

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { HttpError } from '@/server/http/httpError';
import { makeUserService } from '@/server/services';
import { asUserId } from '@/domain/shared';

import crypto from 'crypto';

const GUEST_COOKIE = 'ss_uid';

// 90 days is plenty for a “guest UX session” without pretending it’s a real identity.
const GUEST_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export type Actor =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; guestId: string };

export type RequireUserActor = Extract<Actor, { kind: 'user' }>;
export type RequireGuestActor = Extract<Actor, { kind: 'guest' }>;

/**
 * Canonical identity resolver.
 * - If Clerk has a userId, that is the identity. Period.
 * - Otherwise, the actor is a guest, backed by a durable cookie.
 */
export async function getActor(): Promise<Actor> {
  const { userId } = await auth();

  // ✅ Canonical identity: Clerk user
  if (userId) return { kind: 'user', userId };

  // ✅ Guest identity ONLY when unauthenticated
  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE)?.value;

  // If no guest cookie exists, mint one (this is not “guessing”; it’s creating a new guest identity).
  if (!guestId) {
    guestId = crypto.randomUUID();

    // In route handlers / server actions, cookies() is mutable and this will persist.
    // In some server component contexts it may not be settable; identity still works for the request,
    // and will persist once called in a mutable context (e.g., API routes).
    try {
      cookieStore.set({
        name: GUEST_COOKIE,
        value: guestId,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: GUEST_MAX_AGE_SECONDS,
      });
    } catch {
      // Intentionally swallow: we do NOT downgrade silently; guest remains guest.
      // Persistence of the cookie is a UX concern; correctness is that we never fabricate a user.
    }
  }

  return { kind: 'guest', guestId };
}

/**
 * Hard requirement: endpoint/page must be a logged-in user.
 * Use this for /api/web/* and any dashboard pages that must never accept guests.
 */
export async function requireUserActor(): Promise<RequireUserActor> {
  const actor = await getActor();
  if (actor.kind !== 'user') throwUnauthorized('User authentication required.');
  await makeUserService().ensureUserExists({
    userId: asUserId(actor.userId),
    email: null,
  });

  return actor;
}

/**
 * Hard requirement: endpoint must be guest-only (rare, but useful for onboarding flows).
 */
export async function requireGuestActor(): Promise<RequireGuestActor> {
  const actor = await getActor();
  if (actor.kind !== 'guest') throwForbidden('Guest-only endpoint.');
  return actor;
}

/**
 * Errors are centralized and explicit. No silent downgrades.
 * Routes can catch these and map to HTTP status codes.
 */
function throwUnauthorized(message: string): never {
  throw new HttpError(401, 'UNAUTHORIZED', message);
}

function throwForbidden(message: string): never {
  throw new HttpError(403, 'FORBIDDEN', message);
}
