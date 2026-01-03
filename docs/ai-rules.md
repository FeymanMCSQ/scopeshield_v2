# ScopeShield v2 — AI Operating Rules (Entropy Containment)

These rules constrain AI output so it _cannot_ quietly recreate v1 chaos.
If an AI suggestion conflicts with these rules, the suggestion is invalid.

This doc is designed to be pasted into any AI coding tool as operating constraints.

---

## 0) The Prime Directive

**AI may generate code. Humans must reduce entropy.**

AI is a force multiplier for patterns, not a guardian of coherence.
Therefore the system must be designed so AI cannot accidentally fork truth.

---

## 1) No Duplication Rule (SSOT or death)

### The Law

**The first time logic appears twice, extract it.**
**The second time it appears, you already waited too long.**

### What counts as duplication

- Any repeated `if (...)` logic that decides a business/authorization outcome
- Any repeated identity-resolution logic (cookies/headers/session parsing)
- Any repeated pricing logic
- Any repeated status transition logic
- Any repeated “publicId verification” logic
- Any repeated request parsing patterns that differ subtly between endpoints

### Allowed repetition (small exceptions)

- Trivial mapping/serialization code (DTO shaping) at edges
- UI-only formatting (string/label formatting) if it does not affect truth
- Pure constants repeated **only** if they are obviously harmless (rare)

### Mandatory response behavior for AI

If you detect you are about to copy-paste logic:

1. stop
2. propose a helper extraction
3. show the helper’s signature and home module
4. replace all call sites

---

## 2) When to Extract Helpers (and where they go)

Helpers are extracted **based on ownership**, not convenience.

### Extract immediately if any condition is true

- logic appears in 2 places (even with small differences)
- logic decides a permission (“can this actor do X?”)
- logic decides a transition (“pending → approved?”)
- logic resolves identity (“who is this?”)
- logic touches money/pricing
- logic enforces trust-zone boundaries
- logic handles token validation/verification
- logic introduces a new concept vocabulary (e.g., “pairing”, “device auth”)

### Helper placement rules (non-negotiable)

- Authorization decisions → `src/domain/<module>/policy.ts`
- Workflows/use-cases → `src/domain/<module>/service.ts`
- Pure constructors/validation → `src/domain/<module>/types.ts`
- Error classes/codes → `src/domain/<module>/errors.ts`
- Identity resolution (Actor) → `src/server/getActor.ts` only
- DB access helpers → `src/infra/db/**` only
- Vendor helpers (Stripe/Clerk) → `src/infra/<vendor>/**` only
- Request parsing helpers (non-identity) → `src/infra/http/**` or `src/server/http/**`
- UI formatting helpers → `src/ui/**` only

### Anti-pattern

If a helper is created inside `src/app/api/**` to “reuse logic between routes,”
it is usually a boundary violation. The helper belongs in domain or server.

---

## 3) When AI Must Refuse Implementation

AI must refuse to implement (and instead propose a compliant redesign) if asked to:

### A) Break layer boundaries

- Add Prisma queries in a route handler or React component
- Add Stripe SDK calls in routes/UI instead of an adapter
- Add Clerk session logic directly into domain modules
- Import `next/*` inside `src/domain/**`

### B) Blur trust zones

- Allow `/api/ext/*` endpoints to accept Clerk sessions
- Allow `/api/web/*` endpoints to accept device token auth
- Allow public endpoints to assume a logged-in identity
- Add “fallback identity” chains (`cookie || header || guest`)

### C) Introduce duplicated truth

- Re-implement pricing logic in more than one place
- Re-implement status transition conditions in routes/UI/repos
- Add any “temporary quick fix” that duplicates policy logic

### D) Add silent fallback

- “If missing token, just treat as guest”
- “If publicId invalid, return empty ticket”
- Any behavior that hides errors instead of returning explicit errors

### Required refusal response format

When refusing, AI must:

1. state which rule would be violated (quote the rule title)
2. propose the compliant alternative (where code should live)
3. provide a minimal plan: files + functions + call sites

---

## 4) Required File Headers for New Files (self-describing code)

Every new non-trivial file must begin with this header template within the first ~10 lines:

```ts
/**
 * <Module/FileName>
 * Owns: <what this file is responsible for>
 * Does NOT own: <what it must not do>
 * Layer: <Edge|Application|Domain|Infrastructure>
 * Trust zone: <web|ext|public|none>
 * Calls into: <dependencies / ports>
 * Used by: <primary callers>
 */
```
