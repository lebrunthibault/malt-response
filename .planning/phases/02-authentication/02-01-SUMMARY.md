---
phase: 02-authentication
plan: 01
subsystem: authentication
tags: [auth, otp, login, session, user-menu, route-protection]
requires:
  - 01-01 (Supabase clients, proxy.ts)
  - 01-02 (tRPC, database schema with profiles table)
  - 01-03 (Sidebar, page shell)
provides:
  - OTP login flow (email → 6-digit code → session)
  - User menu dropdown (profile link, logout)
  - Route protection with return URL preservation
  - Skeleton loading state for authenticated pages
  - Rate limit error handling with countdown
affects:
  - 02-02 (Profile page uses user menu built here)
  - 03-* (Document management requires authenticated user)
  - All (app) routes (protected by proxy.ts redirect)
tech-stack:
  added: []
  patterns:
    - Server Actions for auth (requestOtpAction, verifyOtpAction)
    - useActionState (React 19) for form submission
    - Suspense boundary for useSearchParams
    - getUserData helper for centralized user+profile fetching
key-files:
  created:
    - src/app/(auth)/login/actions.ts
    - src/components/layout/user-menu.tsx
    - src/app/(app)/loading.tsx
    - src/lib/auth/get-user-data.ts
  modified:
    - src/app/(auth)/login/page.tsx
    - src/components/layout/sidebar.tsx
    - src/app/(app)/layout.tsx
    - src/proxy.ts
    - src/components/layout/header.tsx
key-decisions:
  - decision: "Use Server Actions (not tRPC) for auth flows"
    rationale: "Auth operations need cookie manipulation; Server Actions have direct access"
    alternatives: ["tRPC procedures", "API routes"]
    impact: "requestOtpAction and verifyOtpAction in actions.ts"
  - decision: "Profile removed from sidebar nav, accessible only from user menu"
    rationale: "User preference — cleaner sidebar with fewer items"
    impact: "Profile link only in user-menu.tsx dropdown"
  - decision: "Suspense boundary required for useSearchParams in login page"
    rationale: "Next.js 16 requires Suspense when using useSearchParams in client components"
    impact: "Login page wrapped in Suspense with fallback"
patterns-established:
  - name: "Server Action Auth Pattern"
    description: "Auth flows via Server Actions with Zod validation and French error messages"
    rationale: "Server Actions can set cookies; tRPC cannot easily"
  - name: "getUserData Helper"
    description: "Centralized function to fetch user + profile from Supabase in server components"
    rationale: "Avoids duplicating auth+profile queries across layouts"
  - name: "Rate Limit Error Extraction"
    description: "Extract seconds from Supabase rate limit error message via regex for user-friendly countdown"
    rationale: "Better UX than generic error message"
duration: "manual (across sessions)"
completed: "2026-02-07"
---

# Phase 02 Plan 01: OTP Login Flow + User Menu + Route Protection

**One-liner:** Complete OTP authentication with email→code login, user menu dropdown with logout, route protection with return URL, and skeleton loading states.

## Accomplishments

**What was built:**

1. **OTP Login Flow**
   - Two-state login page: email entry → OTP code verification
   - Server Actions: requestOtpAction (sends OTP), verifyOtpAction (validates code)
   - Zod validation for email and OTP inputs
   - French error messages for invalid code, expired code, rate limit
   - Rate limit countdown: "Reessayez dans X secondes" extracted from Supabase error
   - Resend code and change email options in verification state

2. **User Menu Dropdown**
   - Avatar with user initial at sidebar bottom
   - "Mon profil" link to /profile
   - "Se deconnecter" with signOut + redirect to /login

3. **Route Protection**
   - proxy.ts preserves `?redirect=` param when redirecting to /login
   - After login, user returns to originally requested page
   - Open redirect prevention (validates path starts with `/`, not `//`)

4. **Loading State**
   - Skeleton loading.tsx for (app) route group
   - Prevents flash of protected content during auth check

5. **SMTP Integration**
   - Brevo SMTP configured and tested via Supabase
   - Email delivery verified end-to-end

## Task Commits

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | OTP login flow with Server Actions | a82fe89 | actions.ts, login/page.tsx, callback/route.ts |
| 2 | User menu, route protection, loading skeleton | 1b2bee5 | user-menu.tsx, sidebar.tsx, layout.tsx, proxy.ts, loading.tsx, header.tsx |
| - | Rate limit error handling | 6ac12e0 | actions.ts, 02-01-PLAN.md |

## Deviations from Plan

1. **Suspense boundary for useSearchParams** — Required by Next.js 16, not in original plan
2. **Header component accepts user prop** — Added for consistent user display across layouts
3. **getUserData helper created** — Centralized auth+profile fetching, not in original plan

## User Setup Required

- Supabase email template: use `{{ .Token }}` (not `{{ .ConfirmationURL }}`)
- Supabase OTP code length: set to 6 digits
- Brevo SMTP: configured with validated sender and SMTP key

## Next Phase Readiness

**Plan 02-02 (Profile page):**
- User menu "Mon profil" link ready
- getUserData helper available for profile data
- tRPC router infrastructure from 01-02 ready for profile router
