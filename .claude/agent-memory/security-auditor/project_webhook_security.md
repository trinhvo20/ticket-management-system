---
name: webhook-security-findings
description: Security findings from audit of inbound email webhook (webhook.ts, webhooks.ts, ticket.ts schema) — timing attack and unbounded input risks found
metadata:
  type: project
---

Webhook endpoint POST /api/webhooks/email reviewed on 2026-06-24.

**Why:** New feature adds external attack surface — inbound email from untrusted senders creates tickets in DB.

**Findings at time of review:**
- MEDIUM: Token comparison in webhook.ts uses `!==` (not timing-safe); susceptible to timing side-channel. Fix: `crypto.timingSafeEqual`.
- MEDIUM: No field-length caps in `inboundEmailSchema` (`subject`, `body`, `bodyHtml`, `fromName`). Unbounded strings stored in Postgres `text` columns. Fix: add `.max()` to each field.
- LOW: Global rate limiter is production-only and covers the webhook route, but no webhook-specific per-source rate limit exists.
- LOW: `res.status(201).json({ ticket })` returns full Prisma ticket object including auto-increment `id`, timestamps, all columns — leaks internal schema shape to webhook callers (low impact since auth is required, but still worth trimming to `{ id, status }`).
- INFO: No HMAC/signature verification — uses simpler Bearer token model. Acceptable for this architecture but replay attacks are not mitigated (no nonce/timestamp).
- SAFE: Prisma `ticket.create` uses structured data, no raw queries — no SQL injection risk.
- SAFE: `webhookAuth` is applied before the router in index.ts (line 39), so auth runs before any body parsing in the route handler.
- SAFE: `express.json()` is mounted at line 27, before the webhook route, so body is parsed correctly and payload size is bounded by Express default (100kb).

**How to apply:** Re-check these two open issues (timing-safe compare, field length caps) if the webhook feature is revisited or extended.
