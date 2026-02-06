# Phase 1: Foundation - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding with Next.js 16, Supabase database schema with RLS, tRPC v11 API skeleton, and application shell with navigation and placeholder pages. No feature logic — just the infrastructure that all subsequent phases build on.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

Full discretion on all foundation decisions:

- **Navigation & layout**: Sidebar vs top nav, page structure, responsive behavior — Claude chooses what fits the "organic, simple" design language from PROJECT.md
- **Visual identity**: Color palette, typography, spacing — organic and simple, nothing over-engineered. Tailwind v4 + shadcn/ui as base
- **Page structure**: Route organization, placeholder pages for each feature area (generate, documents, history, admin, profile)
- **Database schema**: Table structure, column naming, RLS policies — following patterns from Architecture research (ARCHITECTURE.md)
- **tRPC setup**: Router organization, procedure naming, context creation

</decisions>

<specifics>
## Specific Ideas

- User wants "design organique simple — rien de fou" (organic simple design, nothing crazy)
- Stack is imposed: Next.js 16 App Router, tRPC v11, Supabase, shadcn/ui + Tailwind v4, Vercel
- Research recommends: unpdf over pdf-parse, OTP over magic link PKCE, direct-to-Supabase uploads
- Research recommends: 3 Supabase clients (browser, server, admin) for Next.js cookie handling

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-06*
