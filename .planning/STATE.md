# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Generer en un clic une reponse de candidature Malt pertinente et personnalisee, alimentee par le contexte complet du candidat.
**Current focus:** Phase 2 - Authentication

## Current Position

Phase: 2 of 8 (Authentication)
Plan: 1 of 2 in current phase
Status: 02-01 checkpoint paused (Supabase email template needs OTP config)
Last activity: 2026-02-06 -- Tasks 1-2 of 02-01 committed, checkpoint awaiting user verification

Progress: [██░░░░░░░░] 20% (3/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 4m
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 12m | 4m |

**Recent Trend:**
- Last 5 plans: 01-01 (4m), 01-02 (3m), 01-03 (5m)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 8 phases derived from 23 requirements, comprehensive depth
- [Roadmap]: Auth via OTP (not magic link) per research recommendation (PKCE same-browser limitation)
- [Roadmap]: Direct-to-Supabase file uploads to bypass Vercel 4.5MB body limit
- [Roadmap]: Atomic PostgreSQL function for rate limiting to prevent race conditions
- [01-01]: Use Tailwind v4 CSS-first config (@theme inline) instead of tailwind.config.ts
- [01-01]: Implement proxy.ts with getClaims() for token refresh (not middleware.ts with getUser())
- [01-01]: Three-tier Supabase client architecture (browser/server/admin)
- [01-02]: tRPC v11 uses createTRPCReact (not createTRPCProxyClient)
- [01-02]: Server-side caller uses createCallerFactory with cached context
- [01-02]: Single migration file for complete schema (atomic application)
- [01-03]: Sidebar navigation over top nav (French labels scale better)
- [01-03]: Route groups: (app) authenticated, (auth) public, (admin) admin
- [01-03]: Root / redirects to /generate as primary action

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Phase 4 (Generation Core) needs research during planning -- prompt engineering, context assembly, streaming on Vercel
- [Research]: Scanned PDF detection heuristics need validation during Phase 3
- [01-02]: Database migration SQL ready but must be applied manually via Supabase Dashboard or CLI before features work

## Session Continuity

Last session: 2026-02-06
Stopped at: Phase 2, Plan 02-01 checkpoint (task 3/3) — awaiting Supabase email template config
Resume file: .planning/phases/02-authentication/.continue-here.md
