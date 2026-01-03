# ScopeShield v2 — Architecture Contract (Module Boundaries + Dependency Directions)

This document defines the _allowed shape_ of the codebase.
It exists to prevent trust-zone blur, identity duplication, and “convenient” boundary violations.

If a change violates any rule here, it must be redesigned.

---

## 0) The Architecture in One Sentence

**Edge receives requests → Application orchestrates → Domain decides → Infrastructure executes.**

Edges are thin.
Domain is pure(-ish) and boring.
Infrastructure is replaceable.
Application is glue, not logic.

---

## 1) Layers (Edge → Application → Domain → Infrastructure)

### 1.1 Edge Layer

**Where it lives**

- `src/app/**` (Next.js pages/components)
- `src/app/api/**` (route handlers)
- `src/ui/**` (presentational components)

**What it does**

- Parse inputs (HTTP, forms, query params)
- Call `getActor()` / `requireXActor()` to resolve identity
- Invoke application/domain services
- Render UI and return responses

**What it must NOT do**

- Implement business rules
- Implement authorization logic
- Perform direct persistence (no Prisma calls)
- Infer identity from cookies/headers outside the canonical resolver

**Edge mantra**

> Edge orchestrates. Edge does not decide.

---

### 1.2 Application Layer (aka “use-case orchestration / composition”)

**Where it lives**

- `src/server/**` (composition root, server-only helpers)
- `src/server/services/**` (optional: application services that wire domain + infra)
- `src/server/getActor.ts` (canonical identity resolver)

**What it does**

- Build services (wire domain services to infra adapters/repos)
- Provide server-only entrypoints used by routes/pages
- Translate infrastructure concerns into domain-friendly interfaces
- Centralize request-context extraction (actor, correlation ids, etc.)

**What it must NOT do**

- Contain complex business rules that should live in domain services/policies
- Call Next.js UI APIs (no React components here)
- Leak vendor SDKs upward (Stripe/Clerk should stay behind adapters)

**Application mantra**

> Application wires. Domain rules.

---

### 1.3 Domain Layer (the product brain)

**Where it lives**

- `src/domain/**`

**What it owns**

- Entities/types (Ticket, Client, Settings, Template, Payment lifecycle)
- Use-cases / workflows (`service.ts`)
- Authorization policies (`policy.ts`)
- Domain errors (`errors.ts`)
- Pure helpers (formatting, constructors, state machines)

**What it does**

- Decide: “Is this allowed?”
- Decide: “What happens next?”
- Decide: “What is the correct state transition?”
- Define interfaces (ports) that infrastructure must implement:
  - repositories
  - payment adapters
  - auth lookups (if needed)
  - clock/uuid generators (optional)

**What it must NOT do**

- Import Next.js (`next/*`, server components, cookies, headers)
- Import Prisma
- Import Stripe SDK
- Import Clerk/Auth provider SDK
- Read environment variables directly (prefer injection)
- Perform I/O (network, database)

**Domain mantra**

> Domain is meaning, not wiring.

---

### 1.4 Infrastructure Layer (adapters + I/O)

**Where it lives**

- `src/infra/**`

**What it does**

- Implement ports defined by domain:
  - Prisma repositories
  - Stripe adapter
  - Clerk adapter
  - token hashing/verification
  - logging
- Perform actual I/O:
  - database reads/writes
  - external API calls
  - secret handling

**What it must NOT do**

- Import Edge (no Next routes/components)
- Implement business workflows (no multi-step “create ticket + update payment + notify” here)
- Implement authorization decisions (policies belong to domain)

**Infrastructure mantra**

> Infrastructure executes. Domain decides.

---

## 2) Dependency Direction (Sacred Rule)

Allowed dependency flow:

**Edge → Application → Domain → (ports) → Infrastructure**

More explicitly:

- `Edge` MAY import `Application` and `Domain` types.
- `Application` MAY import `Domain` and `Infrastructure` (to wire adapters).
- `Domain` MUST NOT import `Application`, `Edge`, or vendor SDKs.
- `Infrastructure` MAY import `Domain` types/interfaces, but MUST NOT import `Edge`.

If a higher-level layer depends on a lower-level detail directly, swap costs explode.

---

## 3) Import Rules by Layer

### 3.1 Edge CAN import

- `src/server/**` (application entrypoints, getActor helpers)
- `src/domain/**` (types only; avoid domain internals in UI)
- `src/ui/**`
- standard libs, utilities, validation (zod ok here)
- `next/*` and React APIs (obviously)

### 3.2 Edge MUST NEVER import

- `src/infra/**`
- Prisma client directly
- Stripe SDK directly
- Clerk SDK directly (except in narrowly scoped auth UI components, if needed)
- Any code that reads cookies/headers for identity outside `getActor`

---

### 3.3 Application CAN import

- `src/domain/**`
- `src/infra/**` (only to wire implementations)
- server-only utilities (crypto, uuid, env access)

### 3.4 Application MUST NEVER import

- React components / UI
- Next.js route handler helpers beyond request primitives
- Prisma directly _except inside infra repos_ (prefer application calling infra repos)

---

### 3.5 Domain CAN import

- Other `src/domain/**` modules
- Pure libraries (no I/O)
- shared types/interfaces

### 3.6 Domain MUST NEVER import (hard ban)

- `next/*` (including `next/headers`, `next/server`)
- Prisma client
- Stripe SDK
- Clerk/Auth SDK
- `process.env` directly (prefer injection)
- Any filesystem/network calls

---

### 3.7 Infrastructure CAN import

- `src/domain/**` types/interfaces (ports)
- vendor SDKs (Prisma/Stripe/Clerk)
- env/config modules
- crypto/logging libs

### 3.8 Infrastructure MUST NEVER import

- `src/app/**`
- `src/ui/**`
- Next.js routing/UI artifacts
- Domain services/policies should be _used by callers_, not embedded here

---

## 4) Folder Contract (Where Things Go)

### 4.1 Domain module shape (uniform)

Each domain module is a vertical slice:

`src/domain/<module>/`

- `types.ts` — data shapes + constructors (if needed)
- `service.ts` — workflows / use-cases (calls ports)
- `policy.ts` — authorization & transition permissions
- `errors.ts` — domain errors
- `index.ts` — public exports

Rules:

- `service.ts` orchestrates workflows but does NOT do auth inline → calls `policy.ts`.
- `policy.ts` answers permission questions; does not perform persistence.

---

### 4.2 Infrastructure adapters

`src/infra/db/` — Prisma client + repositories  
`src/infra/auth/` — Clerk adapter, token verification helpers  
`src/infra/stripe/` — Stripe adapter + webhook helpers  
`src/infra/crypto/` — hashing, token generation, etc.

Repositories:

- CRUD only
- no authorization decisions
- return domain-friendly objects

---

### 4.3 API namespaces (trust-zone separation)

These namespaces are mandatory to prevent auth confusion:

- `src/app/api/web/**` — requires `Actor.user`
- `src/app/api/ext/**` — requires `Actor.device`
- `src/app/api/public/**` — requires publicId token (possession), no identity

---

## 5) “Where does this belong?” Decision Tree (use this every time)

Given a new piece of code, classify it:

1. **Is it parsing HTTP/UI input or returning a response?**
   → Edge

2. **Is it wiring together services/adapters or resolving Actor from request?**
   → Application

3. **Is it a business decision, rule, workflow, policy, or state machine?**
   → Domain

4. **Is it I/O, vendor SDK usage, DB reads/writes, token hashing, Stripe/Clerk calls?**
   → Infrastructure

If it seems to fit in two places, it is probably:

- a boundary violation, or
- missing a port/interface.

---

## 6) “Thin Route” Contract (Edge enforcement pattern)

All route handlers must follow:

1. `parseRequest(req)`
2. `actor = requireXActor(req)` (or public token validation)
3. call `Service.method(actor, input)`
4. `return response`

Routes must be boring enough to be rewritten from memory.

---

## 7) Win Condition (Operational)

✅ You can point to any future file and say “this belongs here” without debate because:

- its _layer_ is determined by its responsibilities
- its _imports_ are constrained by this contract
- its _trust zone_ is implied by its API namespace

If a file’s correct home is not obvious within 30 seconds, architecture is drifting.
Stop feature work and refactor immediately.
