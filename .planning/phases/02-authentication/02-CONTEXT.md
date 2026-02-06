# Phase 2: Authentication - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely create accounts and access their personal space via email OTP, with sessions that persist across visits. Includes login, logout, session persistence, route protection, and user profile. Does NOT include role-based access (admin is Phase 7), account deletion, or password-based auth.

</domain>

<decisions>
## Implementation Decisions

### Login experience
- Login page layout: Claude's discretion (centered card, split layout, etc.)
- OTP flow: Claude's discretion on same-page transition vs separate step
- First-time users land straight on /generate — no onboarding, no name prompt
- Error messages: friendly & helpful tone — "Code incorrect — vérifiez votre email et réessayez" with resend link always visible

### Route protection
- Unauthenticated users: silent redirect to /login (no toast, no message)
- After login: redirect back to the originally requested page (preserve return URL)
- Auth loading state: skeleton layout (sidebar/shell with skeleton placeholders) — no flash of protected content
- Logout: inside a user menu dropdown (click avatar/name in sidebar), not a standalone sidebar button

### Profile page
- Editable fields: name only — email is read-only (tied to auth)
- Edit interaction: inline edit (click name to edit in place)
- Account info shown: email only (read-only), no join date or other metadata
- Access: from the user menu dropdown (same as logout), not a dedicated sidebar nav item — route is /profile but not in main nav

### Claude's Discretion
- Login page visual layout and branding
- OTP entry UX (same-page transition vs separate view)
- Session expiry handling and refresh token strategy
- Loading skeleton design specifics
- User menu dropdown styling and animation
- Validation feedback on profile edit

</decisions>

<specifics>
## Specific Ideas

- French-language UI labels (established in Phase 1 decisions)
- Sidebar already exists from Phase 1 shell — auth integrates into existing layout
- OTP is the auth method (decided at roadmap level, not magic link — PKCE same-browser limitation)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-02-06*
