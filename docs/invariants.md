# ScopeShield v2 — Invariants (Non-Negotiables)

These are the laws of the world.  
Breaking them recreates v1 failure modes (identity drift, trust-zone blur, duplicated rules, spaghetti).

If a “shortcut” violates any rule below, it is not a shortcut. It is debt with interest.

---

## 0) Definitions (so we stop arguing about words)

**Trust zones (3):**

1. **Web (logged-in)** — requests have a Clerk session.
2. **Extension (paired)** — requests have a device token bound to a user.
3. **Public client link** — requests have a secret token (publicId) but no identity.

**Core entities:**

- Ticket (ChangeRequest), Client, Template, Settings, Device, Payment

**Layers (conceptual):**

- **Edge** = Next.js routes + UI boundaries
- **Domain** = business concepts, use-cases, policies
- **Infrastructure** = Prisma, Clerk, Stripe, crypto, logging

---

## 1) Canonical identity resolution rule (SSOT: Identity)

### The Law

**Identity is decided in exactly one place: `src/server/getActor.ts`.**

No other file may infer identity from cookies/headers/session state.

### Actor model (typed)

`getActor()` returns exactly one of:

- `Actor.user` → `{ kind: 'user', userId }` (Web: Clerk)
- `Actor.device` → `{ kind: 'device', userId, deviceId }` (Extension: paired token)
- `Actor.public` → `{ kind: 'public' }` (Public link)

### Mandatory enforcement

Every route MUST do:

1. Parse input
2. Resolve actor via `getActor()` or stricter helper:
   - `requireUserActor()` for `/api/web/*`
   - `requireDeviceActor()` for `/api/ext/*`
   - Public routes use **publicId token only** (no Clerk assumption)
3. Call domain service
4. Return response

### Prohibitions

- No route may read cookies/headers directly to determine `userId`.
- No “fallback identity” chains (e.g. cookie → header → guest → shrug).
- No silent downgrades (e.g. “if not logged in, treat as guest” on a route that should require a user/device).

### Why this exists

If identity is decided in multiple places, different endpoints will disagree about “who owns this ticket” and you will bleed data across accounts.

**Win sentence:**  
Identity is decided only by `src/server/getActor.ts`, which returns a typed `Actor` used by every route and service entrypoint.

---

## 2) Single Source of Truth rules (SSOT by axis)

If a fact exists, it must exist in exactly one place per axis.

### SSOT axes

- **Identity** → `getActor()` (server)
- **Authorization** → policy modules (`domain/*/policy.ts`)
- **Business workflows** → service modules (`domain/*/service.ts`)
- **Persistence** → database is canonical; extension storage is cache
- **Integrations** → adapters only (`infra/auth/*`, `infra/stripe/*`, etc.)
- **Pricing** → pricing service (one file/module), never re-implemented elsewhere
- **State transitions** → domain service/policy (not routes, not UI)

### The duplication rule

- First duplicate = extract.
- Second duplicate = architecture drift has begun.
- Third duplicate = stop feature work, refactor immediately.

### Callers ask, they don’t decide

Callers (routes/UI) may ask:

- `ticketPolicy.canEdit(actor, ticket)`
- `ticketPolicy.canTransition(ticket, nextStatus)`
  They may NOT implement the if/else logic themselves.

---

## 3) Forbidden patterns (spaghetti triggers)

These are automatic “stop and refactor” signals.

### Identity & auth violations

- Any `cookies()` read inside `src/app/api/**`
- Any route doing: `const userId = ...` from cookie/header directly
- Any “maybe userId” plumbing where the actor kind is unclear
- Any public route that assumes a Clerk session implies authority over public resources

### Layering violations

- `domain/**` importing:
  - `next/*`
  - `cookies`, `headers`
  - `prisma`
  - `auth()` (Clerk)
  - Stripe SDK
- `app/api/**` importing Prisma directly
- UI components reading session/cookies to decide ownership/permissions
- Repositories enforcing authorization (repos do CRUD only)

### Trust-zone blur

- `/api/ext/*` reading Clerk session
- `/api/web/*` accepting device token auth
- `/api/public/*` assuming either web or extension auth

### Convenience traps

- “Just do it here” logic inside routes/pages
- Feature flags that multiply state space (`if isExtension && isLoggedIn && ...`)
- Silent fallbacks to “make it work”

---

## 4) Ownership & authorization rules (who owns what)

### Single-owner placement law

Every behavior has exactly one owner:

- Business rule → domain service
- Permission decision → domain policy
- Data access → repository
- Vendor calls → adapter
- Request parsing/transport → route/controller
- Rendering → UI

If a file crosses layers, move the code to its proper owner.

### Authorization is centralized

No endpoint may manually check ownership with ad-hoc logic.
All authorization goes through policy functions:

- `canViewTicket(actor, ticket)`
- `canEditTicket(actor, ticket)`
- `canWritePins(actor, ticket)`
- etc.

### Trust-zone permissions (high level)

- **Web user** can manage their own tickets/settings/templates/clients.
- **Device** can act only for its bound user and only within allowed extension endpoints.
- **Public** can only access resources addressed by possession secrets (publicId) and only to the extent explicitly allowed (e.g., view/approve/pay/write pins if permitted by policy).

### Canonical persistence rule

- DB is canonical for user settings, templates, tickets, clients, payments.
- Extension storage is cache only (UX convenience, lastReply, local flags).
- If DB and extension disagree, DB wins.

---

## 5) Failure behavior (loud, early, centralized)

- Invalid actor kind for an endpoint → fail immediately (explicit error).
- Missing/invalid device token → 401, no fallback.
- Public token invalid → 404/403 (do not leak existence).
- Domain errors are typed; controllers map them to HTTP codes.
- No silent “best-effort” behavior in core flows.

---

## 6) Quick audit checklist (before merging)

You may merge only if:

- Routes contain no cookie/session reads for identity.
- Every route calls `getActor()`/`requireXActor()` first.
- No Prisma calls outside repositories.
- Authorization logic exists only in policy modules.
- Extension endpoints are under `/api/ext/*` and accept device auth only.
- Public endpoints are under `/api/public/*` and never assume identity.
- Any new business rule lives in `domain/*/service.ts`, not in routes/UI.

---

## 7) The one-line invariant summary

**ScopeShield v2 remains maintainable only if identity is typed and centralized, trust zones are never blurred, and business + authorization decisions exist in exactly one place.**
