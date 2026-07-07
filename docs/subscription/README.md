# Subscription & Website — Docs Index

Fieldore's SaaS subscription system: admin-configurable plans, Stripe **Billing** (provider → Fieldore, separate from the existing Stripe **Connect** for provider → customer invoices), a Next.js website (marketing + customer portal + admin panel), and mobile-app gating (no in-app payments).

## Documents
- **[PLAN.md](./PLAN.md)** — the master plan: goals, architecture, data model, entitlement engine, Stripe Billing design, phased roadmap (Phase 0–10) with per-phase todos, verification, and a progress tracker. **Start here.**

## The one-paragraph flow
Provider visits the **website → pricing → Stripe Checkout → payment success → subscription activated** (webhook). They open the **mobile app → login → API checks subscription → access granted**. If expired, the app sends them back to the website to upgrade; it never shows a payment screen. Admins manage everything (plans, prices, limits, features, badges, order) **from the database via the admin panel — no code changes**.

## Key rules
- **Mobile never processes payments** (App Store / Play compliance).
- **Nothing hardcoded** — plans/prices/limits/features are DB-driven and admin-editable.
- **Only `completed` jobs count** toward limits.
- **Two Stripe integrations** coexist: Connect (existing, untouched) vs Billing (new).

## Web stack
Single **Next.js** app, route groups `(marketing)` / `(portal)` / `(admin)`, against the existing .NET 8 API.

## Launch plans (admin-editable later)
- **Starter** — $29/mo · $159/6-mo · **5 completed jobs**, everything else unlimited.
- **Professional** — $39/mo · $219/6-mo · **unlimited jobs**, priority support.
