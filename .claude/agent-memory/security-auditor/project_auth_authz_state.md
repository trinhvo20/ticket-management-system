---
name: auth-authz-state
description: Current state of server-side auth/authz middleware and the role-check gap pending /api/users implementation
metadata:
  type: project
---

As of 2026-06-11 (commit ea2af3a "Implement role-based access"):

- `server/src/middleware/auth.ts` exports `requireAuth` only — it validates the
  session via `auth.api.getSession` and attaches `req.user`/`req.session`, but
  performs **no role check**. There is no `requireRole`/`requireAdmin` middleware
  anywhere in `server/src` yet.
- `server/src/index.ts` only has `/health`, `/api/auth/*splat`, and `/api/me`
  (requireAuth only, returns `{ user, session }`). No `/api/users` route exists.
- Client added `/users` page (`client/src/pages/Users.tsx`, currently just
  `<h1>Users</h1>`), gated by `ProtectedRoute adminOnly` (checks
  `session.user.role !== 'admin'` -> redirect to `/`), and a Nav link conditional
  on `session?.user.role === 'admin'`. Both are correctly UX-only and not relied
  upon as the security boundary today (page has no real functionality).
- Server-side privilege escalation is currently prevented: `disableSignUp: true`
  in `server/src/lib/auth.ts` (no public registration), and `role` additionalField
  has `input: false` + `defaultValue: 'agent'`, so Better Auth's signUp/updateUser
  endpoints reject client-supplied `role`. No client code calls `authClient.signUp`.
  `prisma/schema.prisma` has `enum Role { admin agent }` on `User.role`.

**Why this matters**: When `/api/users` (or any admin-only route: ticket
reassignment, user management, etc.) is implemented, it MUST add a
`requireRole('admin')`-style middleware (composed after `requireAuth`, reading
`req.user.role`) — otherwise any authenticated agent can call the route directly
(bypassing `ProtectedRoute`/Nav, which are client-only). This is the #1 thing to
check in the next review of `/api/users` or any new admin-only server route.

**How to apply**: When reviewing future `/api/users` (or similar admin-only)
routes, first check whether a `requireRole`/`requireAdmin` middleware now exists
in `server/src/middleware/`, and confirm it's applied to every admin-only route.
Also check that "update user" handlers don't spread `req.body` into
`prisma.user.update` (mass-assignment of `role`), and that user-list endpoints
use explicit Prisma `select` to avoid leaking `Account.password`/tokens or
`Session.token`.
