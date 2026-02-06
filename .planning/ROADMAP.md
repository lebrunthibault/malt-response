# Roadmap: MaltResponse

## Overview

MaltResponse is built in 8 phases following strict dependency order: foundation infrastructure, then authentication, then document management (the context source), then the core AI generation pipeline, then cost controls, then history browsing, then admin tooling, and finally cross-cutting polish. Each phase delivers a coherent, testable capability. The critical path runs through Phases 1-4 (foundation through generation) -- everything else builds on a working generation pipeline.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding, database schema, Supabase config, tRPC skeleton
- [ ] **Phase 2: Authentication** - OTP login, session persistence, logout, user profile
- [ ] **Phase 3: Document Management** - CV upload with PDF extraction, text input, past responses, list and delete
- [ ] **Phase 4: Generation Core** - AI generation pipeline with Claude, context assembly, copy-to-clipboard
- [ ] **Phase 5: Rate Limiting & Notifications** - Daily quota enforcement and owner email alerts
- [ ] **Phase 6: History** - Response history browsing, search/filter, re-generation
- [ ] **Phase 7: Admin Panel** - User list, per-user stats, account disable
- [ ] **Phase 8: Polish & Hardening** - Responsive design, error handling, loading states, edge cases

## Phase Details

### Phase 1: Foundation
**Goal**: A running Next.js application connected to Supabase with database schema, tRPC API layer, and basic page shell -- ready for feature development
**Depends on**: Nothing (first phase)
**Requirements**: None (infrastructure phase -- enables all subsequent phases)
**Success Criteria** (what must be TRUE):
  1. The Next.js application starts locally and deploys to Vercel without errors
  2. All database tables (profiles, documents, job_offers, responses, generation_logs) exist with RLS enabled and tested
  3. tRPC API responds to a health-check call from both server and client components
  4. Supabase clients (browser, server, admin) are configured and can connect to the database
  5. The application shell renders with navigation layout and placeholder pages
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Next.js 16 project setup with Tailwind v4, shadcn/ui, Supabase clients, and proxy.ts
- [ ] 01-02-PLAN.md — tRPC v11 setup with health check and complete database schema migration
- [ ] 01-03-PLAN.md — Application shell with sidebar navigation and all placeholder pages

### Phase 2: Authentication
**Goal**: Users can securely create accounts and access their personal space via email OTP, with sessions that persist across visits
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can sign in by entering their email and receiving an OTP code
  2. User can close the browser, reopen it, and still be logged in (session persists via refresh token)
  3. User can log out from any page in the application
  4. User can view and edit their profile (name, email) from a profile page
  5. Unauthenticated users are redirected to the login page when accessing protected routes
**Plans**: TBD

Plans:
- [ ] 02-01: Supabase OTP auth flow, session management, and route protection
- [ ] 02-02: Profile page with view and edit functionality

### Phase 3: Document Management
**Goal**: Users can upload, view, and manage their candidate context (CV, profile description, past Malt responses) that will feed AI generation
**Depends on**: Phase 2
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05
**Success Criteria** (what must be TRUE):
  1. User can upload a PDF CV and the extracted text is stored in the database for later use in generation
  2. User can add free-text descriptions of their profile, skills, and experience
  3. User can upload past Malt responses as style/tone reference documents
  4. User can see a list of all their uploaded documents organized by type (CV, profile, past responses)
  5. User can delete any of their documents
**Plans**: TBD

Plans:
- [ ] 03-01: Supabase Storage direct upload with signed URLs and PDF text extraction
- [ ] 03-02: Document management UI (upload, list, delete, text input)

### Phase 4: Generation Core
**Goal**: Users can paste a job offer and generate a personalized Malt candidature response in one click, powered by their uploaded context and Claude
**Depends on**: Phase 3
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06
**Success Criteria** (what must be TRUE):
  1. User can paste a job offer description into a text field and optionally add company description and website URL
  2. User clicks "Generate" and receives a personalized candidature response that references their specific CV and experience
  3. The generated response follows Malt conventions (conversational tone, no pricing, consultation-starter)
  4. User can copy the generated response to clipboard with one click and visual confirmation
  5. The generation completes in under 30 seconds end-to-end
**Plans**: TBD

Plans:
- [ ] 04-01: Context builder and prompt engineering (CV + past responses + job offer assembly)
- [ ] 04-02: Claude API integration, generation tRPC procedure, and response display with copy-to-clipboard

### Phase 5: Rate Limiting & Notifications
**Goal**: Generation usage is controlled with a daily quota per user and the owner is alerted when users hit their limit
**Depends on**: Phase 4
**Requirements**: GEN-07, GEN-08
**Success Criteria** (what must be TRUE):
  1. After 3 generations in a day, the user sees a clear message that their daily quota is reached and cannot generate more
  2. The rate limit resets automatically at midnight and the user can generate again the next day
  3. When a user hits the quota, an email notification is sent to the application owner
  4. Concurrent generation requests cannot bypass the daily limit (atomic enforcement)
**Plans**: TBD

Plans:
- [ ] 05-01: Atomic rate limiting (PostgreSQL function) and email notification integration

### Phase 6: History
**Goal**: Users can browse, search, and reuse their past generated responses
**Depends on**: Phase 4
**Requirements**: HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):
  1. User can see a chronological list of all their generated responses with date and the associated job offer text
  2. User can search and filter their response history (by keyword, by date)
  3. User can select a past offer and re-generate a new response for it with one click
**Plans**: TBD

Plans:
- [ ] 06-01: History page with list, search/filter, and re-generation

### Phase 7: Admin Panel
**Goal**: The admin can monitor all users, view usage stats, and manage accounts from a dedicated admin interface
**Depends on**: Phase 4
**Requirements**: ADM-01, ADM-02, ADM-03
**Success Criteria** (what must be TRUE):
  1. Admin can see a list of all registered users with their registration date
  2. Admin can view per-user stats: number of generated responses, number of uploaded documents
  3. Admin can disable a user account (disabled user can no longer log in or generate)
  4. Non-admin users cannot access the admin panel or call admin API procedures
**Plans**: TBD

Plans:
- [ ] 07-01: Admin tRPC router and authorization middleware
- [ ] 07-02: Admin UI (user list, stats, account actions)

### Phase 8: Polish & Hardening
**Goal**: The application is production-ready with consistent UX, proper error handling, and responsive design across devices
**Depends on**: Phases 5, 6, 7
**Requirements**: None (cross-cutting quality phase)
**Success Criteria** (what must be TRUE):
  1. All pages render correctly on mobile devices (freelancers respond from phones)
  2. Every user action has appropriate loading states (spinners, skeleton screens) and error messages
  3. Edge cases are handled gracefully: empty states, network failures, expired sessions, scanned PDFs with no extractable text
  4. The end-to-end workflow (login, upload CV, paste offer, generate, copy) works without friction
**Plans**: TBD

Plans:
- [ ] 08-01: Responsive design pass and loading/error states
- [ ] 08-02: Edge case handling and end-to-end workflow testing

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
Note: Phases 5, 6, and 7 all depend on Phase 4 and could execute in parallel, but sequential execution is simpler for a solo workflow.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. Authentication | 0/2 | Not started | - |
| 3. Document Management | 0/2 | Not started | - |
| 4. Generation Core | 0/2 | Not started | - |
| 5. Rate Limiting & Notifications | 0/1 | Not started | - |
| 6. History | 0/1 | Not started | - |
| 7. Admin Panel | 0/2 | Not started | - |
| 8. Polish & Hardening | 0/2 | Not started | - |
