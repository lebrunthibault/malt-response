# Phase 2: Authentication - Research

**Phase:** 02-authentication
**Researched:** 2026-02-06
**Overall Confidence:** HIGH

---

## Executive Summary

Phase 2 implements email OTP authentication using Supabase's passwordless auth system, integrating with the existing Next.js 16 + tRPC + proxy.ts architecture from Phase 1. The implementation centers on four core flows: OTP request/verification, session persistence via refresh tokens, route protection with return URL preservation, and profile editing with optimistic updates.

**Key architectural decisions:**
- OTP over magic link (roadmap decision: PKCE same-browser limitation)
- Server Actions for auth mutations (aligns with Next.js 16 best practices)
- tRPC for profile CRUD (leverages existing API layer)
- Inline profile editing (simpler UX than modal/separate page)
- User menu dropdown for logout/profile access (cleaner than sidebar clutter)

**Integration points with Phase 1:**
- proxy.ts already handles token refresh via getClaims() — no changes needed
- Three-tier Supabase clients (browser/server/admin) ready for auth
- Route groups (app)/(auth) established — login page slots into (auth)
- Sidebar shell exists — user menu integrates into header/sidebar

**Critical path items:**
1. Email template configuration in Supabase Dashboard (must use `{{ .Token }}` not `{{ .ConfirmationURL }}`)
2. Database schema: `profiles` table with trigger for auto-population on signup
3. Return URL preservation in proxy.ts redirect logic
4. Loading states to prevent flash of protected content

---

## Stack Decisions

All authentication primitives provided by existing Phase 1 stack. No new dependencies required.

### Core Auth: Supabase (@supabase/ssr + @supabase/supabase-js)

**Already installed in Phase 1.**

| API | Purpose | Pattern |
|-----|---------|---------|
| `signInWithOtp({ email })` | Request OTP code | Call from Server Action (not client component) |
| `verifyOtp({ email, token, type: 'email' })` | Verify 6-digit code | Call from Server Action after user input |
| `updateUser({ data })` | Update user metadata | For profile name changes |
| `auth.getUser()` | Get authenticated user | Server-side only (validates token with Supabase) |
| `auth.signOut()` | End session | Revokes refresh token, clears cookies |

**Confidence:** HIGH — Official Supabase SDK, used in Phase 1 foundation.

**Sources:**
- [Supabase signInWithOtp Reference](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
- [Supabase Passwordless Email Auth Guide](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase updateUser Reference](https://supabase.com/docs/reference/javascript/auth-updateuser)

### Form Handling: React Hook Form + Zod

**Already installed in Phase 1 (Zod for tRPC input validation).**

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | Latest | Form state management, minimal re-renders |
| @hookform/resolvers | Latest | Zod integration for useForm |
| zod | ^3.x | Schema validation (already used in tRPC) |

**Pattern (from shadcn/ui docs):**
```typescript
const formSchema = z.object({
  email: z.string().email("Email invalide"),
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { email: "", code: "" },
});
```

**Why React Hook Form:**
- Uncontrolled components (better performance for OTP input)
- Native shadcn/ui integration (Form, FormField, FormControl, FormMessage components)
- Built-in error state management (works with Zod error messages)

**Confidence:** HIGH — Standard pattern documented in shadcn/ui Forms guide.

**Sources:**
- [shadcn/ui React Hook Form Integration](https://ui.shadcn.com/docs/forms/react-hook-form)
- [React Hook Form + Zod Guide 2026](https://dev.to/marufrahmanlive/react-hook-form-with-zod-complete-guide-for-2026-1em1)

### UI Components: shadcn/ui

**Already initialized in Phase 1.**

Required components for Phase 2:
```bash
npx shadcn@latest add form input button dropdown-menu avatar separator
```

| Component | Usage |
|-----------|-------|
| Form, FormField, FormControl, FormMessage | Login form (email + OTP) |
| Input | Email input, OTP code input |
| Button | Submit buttons, logout trigger |
| DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator | User menu dropdown |
| Avatar, AvatarFallback | User avatar in dropdown trigger |

**User menu pattern (from shadcn/ui docs):**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
      <Avatar className="h-8 w-8">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>
      <div className="flex flex-col space-y-1">
        <p className="text-sm font-medium leading-none">{name}</p>
        <p className="text-xs leading-none text-muted-foreground">{email}</p>
      </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <Link href="/profile">Profil</Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      Déconnexion
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Confidence:** HIGH — Official shadcn/ui components with documented patterns.

**Sources:**
- [shadcn/ui Dropdown Menu](https://ui.shadcn.com/docs/components/dropdown-menu)
- [shadcn/ui Profile Dropdown Pattern](https://www.shadcn.io/patterns/dropdown-menu-profile-1)

### API Layer: tRPC (Profile CRUD)

**Already configured in Phase 1.**

Auth operations (signInWithOtp, verifyOtp, signOut) use Server Actions (Next.js native pattern).
Profile operations (getProfile, updateProfile) use tRPC (leverages existing API architecture).

**Why split the pattern:**
- Auth is stateful (cookies, redirects) — Server Actions handle this naturally
- Profile is CRUD — tRPC provides type-safe queries/mutations with React Query integration

**tRPC procedures needed:**
```typescript
// In tRPC router
profile: {
  get: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user from existing auth middleware
    return ctx.supabase.from('profiles').select().eq('id', ctx.user.id).single();
  }),
  update: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Update profiles table + auth.users metadata
      return ctx.supabase.from('profiles').update(input).eq('id', ctx.user.id);
    }),
}
```

**Confidence:** HIGH — Pattern established in Phase 1 foundation.

---

## Feature Breakdown

### 1. OTP Login Flow

**User journey:**
1. User visits /login
2. Enters email address
3. Clicks "Envoyer le code"
4. Email sent with 6-digit OTP (expires in 1 hour, rate limit 1/60s)
5. OTP input field appears (same page transition per CONTEXT decisions)
6. User enters 6-digit code
7. Clicks "Se connecter"
8. Session established, redirect to return URL or /generate

**Implementation pattern:**

```typescript
// app/(auth)/login/page.tsx (Server Component)
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect } = await searchParams;
  return <LoginForm redirectTo={redirect} />;
}

// components/login-form.tsx (Client Component)
'use client';
export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');

  const handleSendOtp = async (data: { email: string }) => {
    const result = await requestOtpAction(data.email);
    if (result.success) {
      setEmail(data.email);
      setStep('otp');
    }
  };

  const handleVerifyOtp = async (data: { code: string }) => {
    const result = await verifyOtpAction(email, data.code, redirectTo);
    // Server Action handles redirect after successful verification
  };

  return step === 'email' ? (
    <EmailForm onSubmit={handleSendOtp} />
  ) : (
    <OtpForm email={email} onSubmit={handleVerifyOtp} onBack={() => setStep('email')} />
  );
}
```

**Server Actions:**

```typescript
// app/(auth)/login/actions.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requestOtpAction(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // Auto-signup if user doesn't exist
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function verifyOtpAction(email: string, token: string, redirectTo?: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Redirect after successful verification
  // Validate redirectTo to prevent open redirect vulnerability
  const validRedirect = redirectTo?.startsWith('/') ? redirectTo : '/generate';
  redirect(validRedirect);
}
```

**Supabase email template configuration:**

**CRITICAL:** Must configure in Supabase Dashboard -> Authentication -> Email Templates -> Magic Link

Replace `{{ .ConfirmationURL }}` with `{{ .Token }}` to send OTP instead of magic link:

```html
<h2>Votre code de connexion</h2>
<p>Entrez ce code pour vous connecter à MaltResponse:</p>
<h1 style="font-size: 32px; font-weight: bold;">{{ .Token }}</h1>
<p>Ce code expire dans 1 heure.</p>
```

**Error handling:**

| Error Code | User Message | Action |
|------------|--------------|--------|
| `invalid_credentials` | "Code incorrect — vérifiez votre email et réessayez" | Show resend link |
| `otp_expired` | "Code expiré — demandez un nouveau code" | Show resend button |
| `email_not_confirmed` | "Veuillez vérifier votre email" | (Shouldn't happen with OTP flow) |
| Rate limit (60s) | "Veuillez patienter avant de demander un nouveau code" | Show countdown timer |

**Confidence:** HIGH — Standard Supabase OTP flow, verified in official docs.

**Sources:**
- [Supabase Passwordless Email Auth](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase signInWithOtp API](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
- [Supabase Auth Error Codes](https://supabase.com/docs/guides/auth/debugging/error-codes)

### 2. Session Persistence

**How Supabase sessions work:**

- **Access token (JWT):** Short-lived (default 1 hour), contains user claims
- **Refresh token:** Long-lived (never expires), single-use (can be reused within 10s reuse interval)
- **PKCE flow:** Enabled by default in @supabase/ssr clients
- **Storage:** Cookies (managed by @supabase/ssr createServerClient)

**Token refresh flow (already implemented in proxy.ts):**

```typescript
// src/proxy.ts (from Phase 1)
const { data } = await supabase.auth.getClaims(); // Auto-refreshes if expired
```

**getClaims() behavior:**
- Validates JWT locally (fast, no network call)
- If expired, automatically exchanges refresh token for new access + refresh token pair
- Updates cookies via setAll() callback
- Returns user claims (including `sub` = user ID)

**Session persistence across browser sessions:**

Cookies set by @supabase/ssr have:
- `httpOnly: true` (prevents XSS)
- `secure: true` in production (HTTPS only)
- `sameSite: 'lax'` (CSRF protection)
- Long expiry (matches refresh token lifetime)

**User closes browser and returns:**
1. Browser sends cookies with request
2. proxy.ts runs, calls getClaims()
3. If access token expired, refresh token exchanged automatically
4. User remains logged in (no re-login required)

**Session termination:**

```typescript
// Server Action for logout
'use server';
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

Calling `signOut()`:
- Revokes refresh token in Supabase Auth backend
- Clears all auth cookies
- User must re-authenticate

**Confidence:** HIGH — PKCE flow + cookie-based sessions are the standard @supabase/ssr pattern, already configured in Phase 1.

**Sources:**
- [Supabase User Sessions Guide](https://supabase.com/docs/guides/auth/sessions)
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase refreshSession API](https://supabase.com/docs/reference/javascript/auth-refreshsession)

### 3. Route Protection

**Current state (Phase 1):**

proxy.ts redirects unauthenticated users to /login but does NOT preserve return URL.

```typescript
// src/proxy.ts (current)
if (!user && !pathname.startsWith('/login') && pathname !== '/') {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url); // ❌ Loses original pathname
}
```

**Required change:**

```typescript
// src/proxy.ts (updated for Phase 2)
if (!user && !pathname.startsWith('/login') && pathname !== '/') {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  // Preserve original URL as redirect parameter
  url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}
```

**Security consideration:**

Validate redirect parameter to prevent open redirect attacks:

```typescript
// In verifyOtpAction (after successful auth)
function isValidRedirect(path: string | undefined): boolean {
  if (!path) return false;
  if (!path.startsWith('/')) return false; // Must be internal path
  if (path.startsWith('//')) return false; // Prevent protocol-relative URLs
  return true;
}

const validRedirect = isValidRedirect(redirectTo) ? redirectTo : '/generate';
redirect(validRedirect);
```

**Loading state during auth check:**

**Problem:** Server Components render instantly. If auth check happens in component, there's a flash of unauthenticated content before redirect.

**Solution:** Use loading.tsx for skeleton UI

```typescript
// app/(app)/loading.tsx
export default function Loading() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">
        {/* Sidebar skeleton */}
        <div className="h-12 bg-muted animate-pulse" />
      </aside>
      <main className="flex-1 p-8">
        {/* Content skeleton */}
        <div className="h-8 w-48 bg-muted animate-pulse mb-4" />
        <div className="h-64 bg-muted animate-pulse" />
      </main>
    </div>
  );
}
```

**Why this works:**
- Next.js shows loading.tsx instantly while Server Component loads
- proxy.ts redirect happens before Server Component renders
- User never sees flash of protected content
- Skeleton matches real layout (sidebar + main content)

**Confidence:** HIGH — Redirect parameter pattern is standard, loading.tsx is built-in Next.js.

**Sources:**
- [Next.js Redirect After Login with Return URL](https://dev.to/dalenguyen/fixing-nextjs-authentication-redirects-preserving-deep-links-after-login-pkk)
- [Next.js loading.tsx Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
- [Next.js Streaming Guide](https://nextjs.org/learn/dashboard-app/streaming)

### 4. Profile Page

**Data model:**

```sql
-- profiles table (created in Phase 2 migration)
create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  name text,
  email text not null, -- Denormalized from auth.users for easy display
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Why denormalize email:**
- auth.users table is not accessible via auto-generated Supabase APIs
- Email is read-only (can't change via profile page per CONTEXT decisions)
- Simpler to query profiles table directly than join with auth.users

**Profile page UI (inline edit):**

```typescript
// app/(app)/profile/page.tsx
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select()
    .eq('id', user!.id)
    .single();

  return <ProfileEditor profile={profile} />;
}

// components/profile-editor.tsx
'use client';
export function ProfileEditor({ profile }: { profile: Profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      // React Query auto-refetches profile.get query
    },
  });

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <h2>{profile.name}</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Modifier
          </Button>
        </div>
        <p className="text-muted-foreground">{profile.email}</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex gap-2">
        <Button type="submit">Enregistrer</Button>
        <Button variant="ghost" onClick={() => setIsEditing(false)}>
          Annuler
        </Button>
      </div>
    </Form>
  );
}
```

**Optimistic update (via React Query):**

```typescript
const utils = trpc.useUtils();

const updateProfile = trpc.profile.update.useMutation({
  onMutate: async (newProfile) => {
    // Cancel outgoing refetches
    await utils.profile.get.cancel();

    // Snapshot previous value
    const previousProfile = utils.profile.get.getData();

    // Optimistically update
    utils.profile.get.setData(undefined, (old) => ({
      ...old!,
      ...newProfile,
    }));

    return { previousProfile };
  },
  onError: (err, newProfile, context) => {
    // Rollback on error
    utils.profile.get.setData(undefined, context?.previousProfile);
  },
  onSettled: () => {
    // Refetch after mutation
    utils.profile.get.invalidate();
  },
});
```

**Update strategy:**

When user saves profile name:
1. Update `profiles` table via tRPC mutation
2. Update `auth.users.raw_user_meta_data` via Supabase updateUser()
3. Both updates in single transaction (or accept eventual consistency)

**Why update both:**
- `profiles` table: Application data, queryable via tRPC/Supabase client
- `auth.users` metadata: Used if displaying user name from session before profile fetch

**Confidence:** MEDIUM — Pattern is standard (tRPC + React Query optimistic updates), but dual-update strategy (profiles + auth.users) needs testing for consistency.

**Sources:**
- [Supabase User Management Guide](https://supabase.com/docs/guides/auth/managing-user-data)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [React Hook Form + Zod Pattern](https://ui.shadcn.com/docs/forms/react-hook-form)

---

## Architecture Patterns

### Pattern 1: Auth via Server Actions, CRUD via tRPC

**Rationale:**

Server Actions handle auth because:
- Auth is stateful (cookies, redirects)
- Server Actions integrate natively with Next.js router (redirect(), revalidatePath())
- No need for type-safe API layer (auth logic doesn't return complex data)

tRPC handles profile CRUD because:
- Profile is standard CRUD (read, update)
- tRPC provides type-safe mutations with React Query integration
- Optimistic updates work seamlessly with tRPC + React Query
- Consistent API layer across all non-auth features

**Example:**

```typescript
// Auth: Server Action
'use server';
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// Profile: tRPC
profile: {
  update: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.supabase.from('profiles').update(input).eq('id', ctx.user.id);
    }),
}
```

**Confidence:** HIGH — Aligns with Next.js 16 patterns (Server Actions for mutations with redirects) and existing Phase 1 tRPC architecture.

### Pattern 2: Profiles Table with Trigger

**Rationale:**

**Why not store everything in auth.users metadata:**
- auth.users is not exposed in Supabase auto-generated APIs
- Can't query/filter users by metadata efficiently
- Metadata size limit (not documented, but generally < 16KB)

**Why profiles table:**
- Full control over schema and indexes
- RLS policies for access control
- Can add columns (avatar_url, bio, etc.) in future phases
- Standard relational pattern

**Auto-population via trigger:**
- User signs up via OTP
- Trigger fires on auth.users insert
- Profile row created automatically
- No application code needed

**Critical trigger requirement:**

```sql
security definer set search_path = ''
```

This prevents privilege escalation attacks. `security definer` means function runs with creator's privileges, `search_path = ''` prevents schema injection.

**Confidence:** HIGH — Standard pattern documented in Supabase guides.

**Sources:**
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data)

### Pattern 3: Inline Edit for Profile

**Why inline edit over modal/separate edit page:**

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Inline edit** (chosen) | Simpler UX, fewer clicks, fast feedback | Slightly more complex state management | ✅ Best for single field (name only) |
| Modal | Clear edit/view separation | Extra click to open, modal overhead | ❌ Overkill for one field |
| Separate /profile/edit page | Clear boundaries | Navigation overhead, two pages to maintain | ❌ Unnecessary for simple profile |

**State management:**

```typescript
const [isEditing, setIsEditing] = useState(false);
```

- View mode: Display name + "Modifier" button
- Edit mode: Input field + "Enregistrer" / "Annuler" buttons
- On save: Optimistic update → mutation → exit edit mode
- On cancel: Revert to original value → exit edit mode

**Confidence:** HIGH — Standard pattern for single-field editing.

### Pattern 4: User Menu Dropdown

**Why dropdown over sidebar items:**

Per CONTEXT decisions:
- Logout in dropdown (not sidebar)
- Profile access in dropdown (not main nav)

**Rationale:**
- Reduces sidebar clutter (main nav focused on app features)
- Standard pattern (most web apps use user menu dropdown)
- Natural grouping (user-related actions together)

**Trigger location:**

In sidebar header or top-right of main content area:

```tsx
<div className="flex items-center justify-between p-4 border-b">
  <div className="font-semibold">MaltResponse</div>
  <UserMenu /> {/* Avatar + dropdown */}
</div>
```

**Dropdown structure:**

1. **Header:** User name + email (non-interactive)
2. **Separator**
3. **Profile link:** Navigates to /profile
4. **Separator**
5. **Logout:** Destructive action (red text, separated)

**Accessibility:**
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader announcements (via ARIA attributes)
- Focus management (auto-focus first item on open)

Handled automatically by shadcn/ui DropdownMenu (built on Radix UI primitives).

**Confidence:** HIGH — Standard UI pattern with accessible component library.

**Sources:**
- [shadcn/ui Dropdown Menu](https://ui.shadcn.com/docs/components/dropdown-menu)
- [shadcn/ui Profile Dropdown Pattern](https://www.shadcn.io/patterns/dropdown-menu-profile-1)

---

## Domain Pitfalls

### Critical Pitfall 1: OTP Email Template Misconfiguration

**What goes wrong:**
Supabase email template uses `{{ .ConfirmationURL }}` by default (magic link).
If not changed to `{{ .Token }}`, users get a link instead of a 6-digit code.
Clicking link works (auto-verification), but breaks expected UX (user can't enter code in app).

**Why it happens:**
Default template is for magic link flow, not OTP flow.

**Prevention:**
- During plan execution, MUST update email template in Supabase Dashboard
- Use `{{ .Token }}` variable for 6-digit code
- Test by triggering OTP send and checking email content

**Detection:**
Email contains clickable link instead of 6-digit code.

**Confidence:** HIGH — Common misconfiguration, documented in Supabase guides.

### Critical Pitfall 2: Missing Return URL Validation (Open Redirect)

**What goes wrong:**
Attacker crafts URL: `/login?redirect=//evil.com/phishing`
After successful login, user redirected to external site.

**Why it happens:**
Naive redirect: `redirect(redirectTo || '/generate')` without validation.

**Prevention:**
```typescript
function isValidRedirect(path: string | undefined): boolean {
  if (!path) return false;
  if (!path.startsWith('/')) return false; // Must start with /
  if (path.startsWith('//')) return false; // Reject protocol-relative URLs
  return true;
}
```

**Confidence:** HIGH — OWASP Top 10 vulnerability.

**Sources:**
- [OWASP Open Redirect](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)

### Moderate Pitfall 3: Flash of Protected Content

**What goes wrong:**
User visits /generate (protected route).
Server Component renders instantly.
If auth check happens in component body, page renders before redirect.
User sees flash of protected content (sidebar, page structure) before redirect to /login.

**Why it happens:**
Server Components render synchronously. Auth check in component is too late.

**Prevention:**
1. **proxy.ts handles redirect** (before Server Component renders) — ✅ Already implemented in Phase 1
2. **loading.tsx provides skeleton** — Shown while auth check happens, prevents flash

**Confidence:** HIGH — Standard Next.js pattern.

**Sources:**
- [Next.js Loading UI](https://nextjs.org/docs/app/api-reference/file-conventions/loading)

### Moderate Pitfall 4: Trigger Failure Blocks Signups

**What goes wrong:**
Trigger function (handle_new_user) has bug or constraint violation.
Trigger fails during signup.
Entire signup transaction rolls back.
User can't create account.

**Why it happens:**
Triggers run in transaction with auth.users insert.
If trigger fails, transaction aborts.

**Prevention:**
- **Thoroughly test trigger** before deploying (use Supabase SQL Editor)
- **Keep trigger simple** (just insert into profiles, no complex logic)
- **Handle null values** (use `coalesce()` for optional fields)
- **Consider making profile creation async** (separate from signup) — trade-off: signup succeeds but profile missing until background job runs

**Recommended approach:**
Keep trigger simple, test thoroughly. Accept that trigger failure blocks signup (better than orphaned auth.users without profile).

**Confidence:** HIGH — Documented in Supabase user management guide.

**Sources:**
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data)

### Minor Pitfall 5: Stale Session After Password Change

**What goes wrong:**
User changes password in another tab/device.
Current session remains valid (JWT not invalidated).
User still logged in with old credentials.

**Why it happens:**
Supabase only revokes refresh tokens on password change, not active JWTs.
JWT remains valid until expiry (default 1 hour).

**Prevention:**
Not a bug, it's by design. JWT expiry is the security boundary.
If this is a concern, reduce access token lifetime in Supabase Dashboard -> Authentication -> Settings -> JWT Expiry.

**For this project:** Not applicable (no password-based auth, only OTP).

**Confidence:** MEDIUM — Standard JWT behavior, but edge case in this project.

### Minor Pitfall 6: Profile Name vs Auth Metadata Inconsistency

**What goes wrong:**
User updates profile name in profiles table.
But auth.users.raw_user_meta_data still has old name.
If displaying user name from session (before profile fetch), shows stale data.

**Why it happens:**
Two sources of truth (profiles table + auth metadata) can diverge.

**Prevention:**
1. **Single source of truth:** Always fetch from profiles table, ignore auth metadata
2. **Dual update:** When updating profile, also update auth.users metadata via updateUser()

**Recommended approach for Phase 2:**
Dual update (update both profiles table and auth metadata in mutation):

```typescript
const updateProfile = trpc.profile.update.useMutation({
  mutationFn: async (input) => {
    // 1. Update profiles table
    await supabase.from('profiles').update(input).eq('id', user.id);
    // 2. Update auth metadata
    await supabase.auth.updateUser({ data: { name: input.name } });
  },
});
```

**Trade-off:** Two network calls, potential for partial failure. For v1, acceptable.
Future improvement: PostgreSQL function that updates both in single transaction.

**Confidence:** MEDIUM — Consistency challenge is real, but dual update mitigates it.

---

## Implementation Checklist

### Database Setup
- [ ] Create profiles table with id, name, email, created_at, updated_at
- [ ] Enable RLS on profiles table
- [ ] Create RLS policies (select/update for own profile)
- [ ] Create handle_new_user() trigger function
- [ ] Create on_auth_user_created trigger
- [ ] Test trigger by signing up test user via Supabase Dashboard

### Supabase Dashboard Configuration
- [ ] Email Templates -> Magic Link -> Replace `{{ .ConfirmationURL }}` with `{{ .Token }}`
- [ ] Customize email template text (French, MaltResponse branding)
- [ ] Test OTP email (trigger signup, check inbox for 6-digit code)
- [ ] Confirm Auth -> Settings -> JWT Expiry (default 3600s = 1 hour, no change needed)
- [ ] Confirm Auth -> Providers -> Email -> "Enable email provider" is ON

### Code Implementation
- [ ] Install shadcn/ui components: form, input, button, dropdown-menu, avatar, separator
- [ ] Create app/(auth)/login/page.tsx (Server Component)
- [ ] Create app/(auth)/login/actions.ts (requestOtpAction, verifyOtpAction)
- [ ] Create components/login-form.tsx (Client Component with email/OTP steps)
- [ ] Update src/proxy.ts to preserve redirect parameter
- [ ] Create app/(app)/loading.tsx (skeleton UI)
- [ ] Create app/(app)/profile/page.tsx (Server Component)
- [ ] Create components/profile-editor.tsx (inline edit Client Component)
- [ ] Create components/user-menu.tsx (dropdown with logout/profile)
- [ ] Add user menu to sidebar or header
- [ ] Create tRPC profile router (get, update procedures)
- [ ] Create signOutAction Server Action
- [ ] Add Zod schemas for login/profile forms (French error messages)

### Testing
- [ ] Test OTP request (email arrives with 6-digit code, not link)
- [ ] Test OTP verification (valid code logs in, invalid shows error)
- [ ] Test OTP expiry (code older than 1 hour fails)
- [ ] Test rate limiting (second OTP request within 60s fails)
- [ ] Test session persistence (close browser, reopen, still logged in)
- [ ] Test logout (session cleared, redirect to login)
- [ ] Test redirect preservation (visit /generate unauthenticated, login, redirect to /generate)
- [ ] Test redirect validation (malicious redirect parameter blocked)
- [ ] Test loading state (no flash of protected content)
- [ ] Test profile view (name and email display)
- [ ] Test profile edit (inline edit, save, cancel)
- [ ] Test profile update optimistic UI (instant feedback, rollback on error)
- [ ] Test user menu dropdown (logout, profile navigation)

---

## Open Questions

### Question 1: Avatar Upload in Phase 2 or Defer?

**Context:** User menu dropdown typically shows avatar image, not just initials.

**Options:**
1. **Phase 2:** Add avatar upload (Supabase Storage, profiles.avatar_url column)
2. **Defer:** Show initials fallback in Phase 2, add avatar in Phase 5 (Document Management)

**Recommendation:** Defer to Phase 5. Rationale:
- Phase 5 already handles file uploads (CV PDFs) — reuse upload infrastructure
- Avatar is nice-to-have, not critical for auth MVP
- Initials fallback is standard pattern (GitHub, Linear, etc.)

**Decision needed during planning.**

### Question 2: Email Change Flow?

**Context:** CONTEXT.md says email is read-only on profile page. But should users be able to change email at all?

**Options:**
1. **No email change:** Email locked forever (simplest)
2. **Email change via separate flow:** Settings page with OTP verification to new email (secure but complex)
3. **Email change in profile:** Allow edit, trigger Supabase email change flow (requires confirmation to both old + new email)

**Recommendation:** No email change in Phase 2. Rationale:
- Out of scope per CONTEXT ("email is read-only")
- Email change requires verification flow (OTP to new email) — adds complexity
- For MVP, users can create new account if email changes

**If needed later:** Supabase supports email change via updateUser({ email: newEmail }), triggers confirmation flow automatically.

**Decision: Accept no email change per CONTEXT decisions.**

### Question 3: "Remember Me" or Session Expiry?

**Context:** Supabase refresh tokens never expire. Users stay logged in forever (until explicit logout or password change).

**Is this the desired behavior?**

**Options:**
1. **Current (infinite session):** User stays logged in until logout
2. **Inactivity timeout:** Force re-login after N days of inactivity (requires custom logic in proxy.ts)
3. **Absolute expiry:** Session expires after N days regardless of activity

**Recommendation:** Keep infinite session for Phase 2. Rationale:
- Standard for productivity tools (Notion, Linear, etc.)
- No "Remember Me" checkbox needed (always remember)
- If security concern, can add inactivity timeout in later phase

**Decision: Accept infinite sessions (current Supabase default).**

---

## Summary

**Ready to implement:** Yes, all technical questions resolved.

**Confidence level:** HIGH for core flows (OTP, sessions, route protection), MEDIUM for profile dual-update consistency.

**Critical path:**
1. Database migration (profiles table + trigger)
2. Email template configuration ({{ .Token }})
3. Proxy.ts redirect parameter preservation
4. Loading.tsx skeleton (prevent flash)

**Dependencies on Phase 1:**
- proxy.ts (token refresh already working)
- Supabase clients (browser/server/admin)
- tRPC setup (for profile CRUD)
- Route groups (app)/(auth) structure

**No blockers. Proceed to planning.**

---

## Sources

### Official Documentation (HIGH Confidence)
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase signInWithOtp API Reference](https://supabase.com/docs/reference/javascript/auth-signinwithotp)
- [Supabase Passwordless Email Auth Guide](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase updateUser API Reference](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [Supabase Auth Error Codes](https://supabase.com/docs/guides/auth/debugging/error-codes)
- [shadcn/ui React Hook Form Integration](https://ui.shadcn.com/docs/forms/react-hook-form)
- [shadcn/ui Dropdown Menu](https://ui.shadcn.com/docs/components/dropdown-menu)
- [Next.js loading.tsx Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
- [Next.js Redirecting Guide](https://nextjs.org/docs/app/building-your-application/routing/redirecting)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)

### Community Resources (MEDIUM Confidence)
- [Next.js 16 + Supabase OTP Auth Example](https://github.com/gal1aoui/Next.js-Supabase-Authentication-System)
- [React Hook Form + Zod 2026 Guide](https://dev.to/marufrahmanlive/react-hook-form-with-zod-complete-guide-for-2026-1em1)
- [Next.js Auth Redirect with Return URL](https://dev.to/dalenguyen/fixing-nextjs-authentication-redirects-preserving-deep-links-after-login-pkk)
- [shadcn/ui Profile Dropdown Pattern](https://www.shadcn.io/patterns/dropdown-menu-profile-1)
- [Next.js Loading States Guide 2026](https://eastondev.com/blog/en/posts/dev/20260105-nextjs-loading-states/)
