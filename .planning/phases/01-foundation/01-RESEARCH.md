# Phase 1: Foundation - Research

**Researched:** 2026-02-06
**Domain:** Next.js 16 App Router + tRPC v11 + Supabase + shadcn/ui project scaffolding
**Confidence:** HIGH

## Summary

Phase 1 is pure infrastructure: project scaffolding, database schema, Supabase configuration, tRPC API skeleton, and application shell with navigation and placeholder pages. No feature logic -- just the foundation that all subsequent phases build on.

The standard approach for this stack is well-documented across official sources. Next.js 16 introduces breaking changes from Next.js 15 (`proxy.ts` replaces `middleware.ts`, all request APIs are async, the function export must be named `proxy`). tRPC v11 has a specific setup pattern for App Router with `createTRPCOptionsProxy` and `createTRPCContext` from `@trpc/tanstack-react-query`. Supabase SSR uses `@supabase/ssr` with `getAll()`/`setAll()` cookie methods and now recommends `getClaims()` over `getUser()` for proxy-level token refresh (faster, local JWT verification). shadcn/ui with Tailwind v4 uses CSS-first configuration with `@theme inline` and OKLCH colors.

**Primary recommendation:** Follow the verified code patterns documented below exactly. The biggest risk in Phase 1 is using outdated patterns from Next.js 15 or tRPC v10 tutorials. Every code example below has been verified against official 2026 documentation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No locked decisions -- all foundation decisions are at Claude's discretion.

### Claude's Discretion
Full discretion on all foundation decisions:

- **Navigation & layout**: Sidebar vs top nav, page structure, responsive behavior -- Claude chooses what fits the "organic, simple" design language from PROJECT.md
- **Visual identity**: Color palette, typography, spacing -- organic and simple, nothing over-engineered. Tailwind v4 + shadcn/ui as base
- **Page structure**: Route organization, placeholder pages for each feature area (generate, documents, history, admin, profile)
- **Database schema**: Table structure, column naming, RLS policies -- following patterns from Architecture research (ARCHITECTURE.md)
- **tRPC setup**: Router organization, procedure naming, context creation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.x (latest) | Full-stack React framework | App Router, Turbopack default, proxy.ts, React 19.2 |
| React | 19.2 (bundled) | UI rendering | Required by Next.js 16; function components, no forwardRef |
| TypeScript | 5.1.0+ (latest 5.x) | Type safety | tRPC v11 peer dependency; strict mode required |
| @trpc/server | ^11.8.x | Type-safe API server | End-to-end types, shorthand router syntax |
| @trpc/client | ^11.9.x | Type-safe API client | httpBatchLink for batched requests |
| @trpc/tanstack-react-query | ^11.x | React Query integration | Server-side prefetching with RSC, auto-hydration |
| @tanstack/react-query | ^5.90.x | Server state management | Required by tRPC v11 |
| @supabase/supabase-js | ^2.95.x | Supabase client SDK | PostgreSQL + Auth + Storage |
| @supabase/ssr | ^0.8.x | SSR cookie handling | Replaces deprecated auth-helpers-nextjs |
| shadcn/ui | Latest (CLI-based) | Component library | Copy-paste components, Tailwind v4 + React 19 compatible |
| Tailwind CSS | v4.x | Utility-first CSS | CSS-first config, OKLCH colors, @theme inline |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| superjson | ^2.x | Data transformer | tRPC serialization (Date, BigInt, etc.) -- required on BOTH server init AND client link |
| zod | ^3.x | Input validation | tRPC input schemas |
| server-only | latest | Import guard | Prevents server code in client bundles |
| client-only | latest | Import guard | Prevents client code in server bundles |
| tw-animate-css | latest | Animation utilities | Replaces deprecated tailwindcss-animate for shadcn/ui |
| tailwind-merge | latest | Class merging | cn() helper for Tailwind class conflicts |
| clsx | latest | Conditional classes | Lightweight conditional class joining |
| lucide-react | latest | Icons | Default icon set for shadcn/ui |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tRPC | Next.js Server Actions only | Loses type-safe client hooks, React Query cache, streaming |
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is DEPRECATED, do not use |
| tailwindcss-animate | tw-animate-css | tailwindcss-animate is DEPRECATED, use tw-animate-css |
| httpBatchLink | httpBatchStreamLink | Use httpBatchStreamLink when streaming is needed (Phase 4), httpBatchLink is fine for Phase 1 |

**Installation:**

```bash
# Create Next.js 16 project
npx create-next-app@latest maltresponse --ts --tailwind --app

# Initialize shadcn/ui (auto-detects Tailwind v4)
npx shadcn@latest init

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query
npm install zod superjson
npm install server-only client-only
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── api/trpc/[trpc]/route.ts     # tRPC HTTP handler
│   ├── (auth)/                       # Auth pages (public, no layout)
│   │   ├── login/page.tsx
│   │   ├── callback/route.ts
│   │   └── error/page.tsx
│   ├── (app)/                        # Authenticated app pages (shared layout with nav)
│   │   ├── layout.tsx                # App shell with sidebar nav
│   │   ├── page.tsx                  # Dashboard / redirect to generate
│   │   ├── generate/page.tsx         # Placeholder
│   │   ├── documents/page.tsx        # Placeholder
│   │   ├── history/page.tsx          # Placeholder
│   │   └── profile/page.tsx          # Placeholder
│   ├── (admin)/                      # Admin pages (separate layout)
│   │   └── admin/
│   │       └── page.tsx              # Placeholder
│   ├── layout.tsx                    # Root layout with TRPCProvider
│   └── page.tsx                      # Landing / redirect
├── trpc/
│   ├── init.ts                       # initTRPC, context, base procedures
│   ├── routers/
│   │   ├── _app.ts                   # Root appRouter (merges sub-routers)
│   │   └── health.ts                 # Health check procedure (Phase 1 only)
│   ├── client.tsx                    # TRPCProvider, useTRPC hook
│   ├── server.tsx                    # Server-side caller, HydrateClient, prefetch
│   └── query-client.ts              # React Query configuration
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (createBrowserClient)
│   │   ├── server.ts                 # Server client (createServerClient + cookies)
│   │   └── admin.ts                  # Admin client (service_role, server-only)
│   └── utils.ts                      # cn() helper
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx               # App sidebar navigation
│   │   └── header.tsx                # Page header
│   └── theme-provider.tsx            # Optional dark mode
├── proxy.ts                          # Token refresh + redirects (NOT auth gate)
└── .env.local                        # Environment variables
```

### Pattern 1: tRPC v11 Server-Side Prefetching with RSC

**What:** Prefetch data in Server Components, hydrate to Client Components without refetch.
**When to use:** Every page that needs data from tRPC.

**trpc/init.ts:**
```typescript
// Source: https://trpc.io/docs/client/tanstack-react-query/server-components
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const createTRPCContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
});

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// Authenticated procedure
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

**trpc/server.tsx:**
```typescript
// Source: https://trpc.io/docs/client/tanstack-react-query/server-components
import 'server-only';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import { createTRPCContext } from './init';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

export const caller = appRouter.createCaller(createTRPCContext);
```

**trpc/client.tsx:**
```typescript
// Source: https://trpc.io/docs/client/tanstack-react-query/server-components
'use client';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import superjson from 'superjson';
import { useState } from 'react';
import { makeQueryClient } from './query-client';
import type { AppRouter } from './routers/_app';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

let browserQueryClient: QueryClient;

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

function getUrl() {
  const base = (() => {
    if (typeof window !== 'undefined') return '';
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'http://localhost:3000';
  })();
  return `${base}/api/trpc`;
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: getUrl(),
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
```

**trpc/query-client.ts:**
```typescript
// Source: https://trpc.io/docs/client/tanstack-react-query/server-components
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}
```

### Pattern 2: Three Supabase Clients

**What:** Browser, Server, and Admin clients with distinct cookie/auth handling.
**When to use:** Always. This is the required pattern for Next.js + Supabase.

**lib/supabase/client.ts (browser):**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

**lib/supabase/server.ts (server):**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignored when called from Server Component (cookies are read-only)
            // The proxy.ts will handle the actual cookie writes
          }
        },
      },
    },
  );
}
```

**lib/supabase/admin.ts (admin / service_role):**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createClient } from '@supabase/supabase-js';
import 'server-only'; // CRITICAL: prevents client-side import

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER NEXT_PUBLIC_
);
```

### Pattern 3: proxy.ts for Token Refresh (NOT Auth Gate)

**What:** Refresh Supabase auth tokens on every request via cookies. Redirect unauthenticated users optimistically.
**When to use:** Always for Supabase Auth with Next.js 16.

**CRITICAL:** `proxy.ts` should NOT be relied upon as the sole auth layer (CVE-2025-29927). It handles token refresh and optimistic redirects. Real auth validation happens in Server Components and tRPC procedures.

**IMPORTANT:** In Next.js 16, the file MUST be named `proxy.ts` and the function MUST be exported as `proxy` (not `middleware`). The old `middleware.ts` is deprecated.

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// proxy.ts (at project root or src/)
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() validates JWT locally (fast, no network request)
  // and refreshes expired tokens automatically.
  // Use getUser() in tRPC context for authoritative session validation.
  const { data: { claims } } = await supabase.auth.getClaims();
  const user = claims?.sub ? { id: claims.sub } : null;

  // Optimistic redirect for unauthenticated users
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**NOTE on getClaims() vs getUser():**
- `getClaims()` validates JWT locally against Supabase's JWKS (fast, cached, no network call for asymmetric key projects). Supabase officially recommends it for proxy/middleware. It also handles token refresh automatically.
- `getUser()` always makes a network call to Supabase Auth server (authoritative but slower). Use in tRPC context and Server Components where you need definitive session state.
- `getSession()` should NEVER be trusted server-side -- it does not validate the JWT.

### Pattern 4: tRPC HTTP Handler (Route Handler)

```typescript
// Source: https://trpc.io/docs/client/tanstack-react-query/server-components
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

### Pattern 5: Database Schema with RLS

**What:** All 5 tables with RLS enabled and policies.
**When to use:** Phase 1 database setup. This schema is from the architecture research and supports all subsequent phases.

Key RLS pattern for every table:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

### Anti-Patterns to Avoid

- **Auth in proxy.ts as sole security layer:** CVE-2025-29927 showed proxy/middleware auth can be bypassed. proxy.ts is for optimistic redirects and token refresh ONLY. Real auth validation in Server Components (`getUser()`) and tRPC `authedProcedure`.
- **Using `middleware.ts` instead of `proxy.ts`:** Deprecated in Next.js 16. The file is renamed, function export must be `proxy`. Use the codemod if migrating: `npx @next/codemod@canary middleware-to-proxy .`
- **Sync access to cookies(), headers(), params, searchParams:** All async in Next.js 16. Forgetting `await` produces silent `[object Promise]` values, not errors. Always `const cookieStore = await cookies()`.
- **tRPC v10 patterns:** Do NOT use `@trpc/next` (Pages Router only), `@trpc/react-query` (renamed to `@trpc/tanstack-react-query`), or `createTRPCProxyClient` (use `createTRPCClient`). The `transformer` property must be on BOTH `initTRPC.create()` AND on each link (`httpBatchLink`).
- **`@supabase/auth-helpers-nextjs`:** DEPRECATED. Use `@supabase/ssr` exclusively.
- **Individual cookie methods (get/set/remove):** Use ONLY `getAll()` and `setAll()` with `@supabase/ssr`. Individual methods break the session management.
- **`tailwindcss-animate`:** DEPRECATED. Use `tw-animate-css`.
- **`tailwind.config.js`:** Not used with Tailwind v4. All config in CSS via `@theme inline`.
- **`React.forwardRef`:** Not needed in React 19. shadcn/ui components use plain function components with `data-slot`.
- **`getSession()` in server code:** Never trust it server-side. Use `getClaims()` (fast, local JWT validation) in proxy or `getUser()` (network call to Supabase Auth server) in tRPC context.
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`:** Supabase is transitioning to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use the new name for new projects (both work, but new name is forward-compatible).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS class merging | Manual string concatenation | `cn()` helper (clsx + tailwind-merge) | Edge cases with conflicting Tailwind classes |
| Auth token refresh | Custom cookie logic | `@supabase/ssr` with `getAll()`/`setAll()` | Complex cookie lifecycle across SSR/proxy |
| tRPC types | Manual API types | tRPC inferred types from `AppRouter` | Type drift between client and server |
| Query hydration | Manual cache population | tRPC `prefetch()` + `HydrateClient` | Streaming, dehydration, pending state handling |
| Component primitives | Custom a11y components | shadcn/ui (Radix primitives) | WAI-ARIA compliance, keyboard nav, screen readers |
| Database migrations | Manual SQL in dashboard | Supabase migration files (`supabase/migrations/`) | Version control, reproducibility, team workflow |

**Key insight:** Phase 1 is entirely about wiring standard patterns together. Every component has an official, verified setup guide. The value is in correct integration, not innovation.

## Common Pitfalls

### Pitfall 1: Next.js 16 Async Request APIs

**What goes wrong:** `cookies()`, `headers()`, `params`, `searchParams` are all async Promises in Next.js 16. Forgetting `await` produces silent `[object Promise]` string values, not errors.
**Why it happens:** Next.js 15 had sync-to-async migration period; Next.js 16 removed sync access entirely.
**How to avoid:** Always `const cookieStore = await cookies()`. In tRPC context creation, ensure cookies are awaited before Supabase client creation. Run the codemod: `npx @next/codemod@canary upgrade latest`.
**Warning signs:** Auth tokens appearing as undefined, search params appearing empty, string comparisons failing silently.

### Pitfall 2: Supabase RLS Disabled by Default

**What goes wrong:** New tables have RLS disabled. Anyone with the public anon key can read/write all rows.
**Why it happens:** Supabase defaults to open access for development convenience.
**How to avoid:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` immediately after every `CREATE TABLE`. Write policies before inserting any data. Test cross-user access.
**Warning signs:** Supabase dashboard shows "RLS disabled" warnings. Check Security Advisor in Supabase dashboard.

### Pitfall 3: tRPC v11 Import Changes

**What goes wrong:** Using v10 package names or API patterns causes silent failures or build errors.
**Why it happens:** tRPC v11 renamed several packages and moved configuration options.
**How to avoid:** Use `@trpc/tanstack-react-query` (not `@trpc/react-query`). Use `createTRPCClient` (not `createTRPCProxyClient`). Use `createTRPCContext` from `@trpc/tanstack-react-query` (not from `@trpc/react-query`). Use `useTRPC()` hook (not `trpc.` proxy on client side).
**Warning signs:** Build errors mentioning deprecated exports. TypeScript errors on tRPC client creation.

### Pitfall 4: Supabase Cookie Method Mismatch

**What goes wrong:** Using individual `get`/`set`/`remove` cookie methods instead of `getAll()`/`setAll()`.
**Why it happens:** Older Supabase tutorials show individual cookie methods.
**How to avoid:** The `@supabase/ssr` docs explicitly state: "Always use `getAll()` and `setAll()`." Never use individual cookie methods.
**Warning signs:** Sessions not persisting, random logouts, "Invalid refresh token" errors.

### Pitfall 5: Supabase Environment Variable Naming

**What goes wrong:** Using `NEXT_PUBLIC_SUPABASE_ANON_KEY` when Supabase is transitioning to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
**Why it happens:** Supabase is rebranding key names. Both work currently but new projects should use the new name.
**How to avoid:** Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for new projects. Never expose `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` prefix.
**Warning signs:** Deprecation warnings in Supabase dashboard.

### Pitfall 6: tRPC Content-Type 415 Errors

**What goes wrong:** tRPC v11 validates Content-Type headers on POST requests. Custom fetch wrappers or proxy configurations that strip headers cause 415 errors on all mutations.
**Why it happens:** New in tRPC v11 for security.
**How to avoid:** Ensure `Content-Type: application/json` passes through on all tRPC POST requests. Test mutations early in production-like environment.
**Warning signs:** All POST-based tRPC calls returning 415 errors.

### Pitfall 7: superjson Transformer Must Be in Both Places

**What goes wrong:** Adding `transformer: superjson` only to `initTRPC.create()` or only to the link, but not both.
**Why it happens:** tRPC v11 moved transformer config from root-only (v10) to requiring it on both server init AND each client link.
**How to avoid:** Add `transformer: superjson` to `initTRPC.create({})` AND to `httpBatchLink({})`. TypeScript will flag the mismatch.
**Warning signs:** Dates arriving as strings instead of Date objects. Serialization errors on complex types.

### Pitfall 8: proxy.ts Function Name Must Be "proxy"

**What goes wrong:** Exporting the function as `middleware` in `proxy.ts` or naming the file `middleware.ts`.
**Why it happens:** Copying old Next.js 15 patterns or Supabase templates that haven't been updated for Next.js 16.
**How to avoid:** File must be `proxy.ts`, function must be `export async function proxy(request)` or `export default function proxy(request)`.
**Warning signs:** Proxy not executing, Vercel console warnings about missing middleware.

## Code Examples

### Health Check Procedure (Phase 1 verification)

```typescript
// trpc/routers/health.ts
import { baseProcedure, createTRPCRouter } from '../init';

export const healthRouter = createTRPCRouter({
  check: baseProcedure.query(async ({ ctx }) => {
    // Verify Supabase connection
    const { data, error } = await ctx.supabase
      .from('profiles')
      .select('count')
      .limit(0);

    return {
      status: 'ok',
      database: error ? 'error' : 'connected',
      auth: ctx.user ? 'authenticated' : 'anonymous',
      timestamp: new Date(),
    };
  }),
});
```

### Root Router

```typescript
// trpc/routers/_app.ts
import { createTRPCRouter } from '../init';
import { healthRouter } from './health';

export const appRouter = createTRPCRouter({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
```

### Root Layout with TRPCProvider

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { TRPCReactProvider } from '@/trpc/client';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'MaltResponse',
  description: 'Generez des reponses Malt personnalisees',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
```

### Auth Callback Route Handler

```typescript
// app/(auth)/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/generate`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
```

### Database Schema SQL (complete)

```sql
-- profiles: extends auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_generation_count INTEGER NOT NULL DEFAULT 0,
  last_generation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- documents: user-uploaded files
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('cv', 'past_response', 'profile_info', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_user_doc_type ON documents(user_id, doc_type);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE USING (auth.uid() = user_id);

-- job_offers: pasted job offer data
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT NOT NULL,
  company_name TEXT,
  company_description TEXT,
  company_website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_offers_user_id ON job_offers(user_id);

ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own job offers"
  ON job_offers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- responses: generated candidature messages
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  generated_text TEXT NOT NULL,
  model_used TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responses_user_id ON responses(user_id);
CREATE INDEX idx_responses_job_offer_id ON responses(job_offer_id);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses"
  ON responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses"
  ON responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- generation_logs: daily usage tracking
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, generation_date)
);

CREATE INDEX idx_generation_logs_user_date
  ON generation_logs(user_id, generation_date);

ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON generation_logs FOR SELECT USING (auth.uid() = user_id);

-- Atomic rate limit function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_date DATE,
  p_max_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO generation_logs (user_id, generation_date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, generation_date)
  DO UPDATE SET count = generation_logs.count + 1
  RETURNING count INTO v_count;

  IF v_count > p_max_count THEN
    UPDATE generation_logs
    SET count = count - 1
    WHERE user_id = p_user_id AND generation_date = p_date;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', p_max_count - v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for user documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', false);

CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Tailwind v4 CSS Theme (globals.css)

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* Organic, simple color palette */
:root {
  --background: oklch(0.985 0.002 90);
  --foreground: oklch(0.205 0.015 60);
  --card: oklch(0.99 0.002 90);
  --card-foreground: oklch(0.205 0.015 60);
  --popover: oklch(0.99 0.002 90);
  --popover-foreground: oklch(0.205 0.015 60);
  --primary: oklch(0.48 0.08 160);
  --primary-foreground: oklch(0.98 0.005 160);
  --secondary: oklch(0.94 0.01 90);
  --secondary-foreground: oklch(0.28 0.015 60);
  --muted: oklch(0.94 0.008 90);
  --muted-foreground: oklch(0.52 0.015 60);
  --accent: oklch(0.94 0.01 90);
  --accent-foreground: oklch(0.28 0.015 60);
  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.98 0.005 25);
  --border: oklch(0.9 0.008 90);
  --input: oklch(0.9 0.008 90);
  --ring: oklch(0.48 0.08 160);
  --radius: 0.625rem;
  --sidebar-background: oklch(0.975 0.003 90);
  --sidebar-foreground: oklch(0.35 0.015 60);
  --sidebar-primary: oklch(0.48 0.08 160);
  --sidebar-primary-foreground: oklch(0.98 0.005 160);
  --sidebar-accent: oklch(0.94 0.01 90);
  --sidebar-accent-foreground: oklch(0.28 0.015 60);
  --sidebar-border: oklch(0.92 0.008 90);
  --sidebar-ring: oklch(0.48 0.08 160);
}

.dark {
  --background: oklch(0.145 0.01 60);
  --foreground: oklch(0.94 0.005 90);
  --card: oklch(0.17 0.01 60);
  --card-foreground: oklch(0.94 0.005 90);
  --popover: oklch(0.17 0.01 60);
  --popover-foreground: oklch(0.94 0.005 90);
  --primary: oklch(0.6 0.1 160);
  --primary-foreground: oklch(0.145 0.01 60);
  --secondary: oklch(0.22 0.01 60);
  --secondary-foreground: oklch(0.94 0.005 90);
  --muted: oklch(0.22 0.008 60);
  --muted-foreground: oklch(0.62 0.015 60);
  --accent: oklch(0.22 0.01 60);
  --accent-foreground: oklch(0.94 0.005 90);
  --destructive: oklch(0.45 0.2 25);
  --destructive-foreground: oklch(0.94 0.005 90);
  --border: oklch(0.25 0.008 60);
  --input: oklch(0.25 0.008 60);
  --ring: oklch(0.6 0.1 160);
  --sidebar-background: oklch(0.16 0.01 60);
  --sidebar-foreground: oklch(0.85 0.008 90);
  --sidebar-primary: oklch(0.6 0.1 160);
  --sidebar-primary-foreground: oklch(0.145 0.01 60);
  --sidebar-accent: oklch(0.22 0.01 60);
  --sidebar-accent-foreground: oklch(0.85 0.008 90);
  --sidebar-border: oklch(0.22 0.008 60);
  --sidebar-ring: oklch(0.6 0.1 160);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar-background: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

Note: The color palette uses warm, earthy tones (hue 90 for warm gray, hue 160 for muted green primary) to match the "organic, simple" design language. shadcn/ui init will generate its own theme -- customize the values after init to match the organic palette.

### Environment Variables

```bash
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` with `export function middleware()` | `proxy.ts` with `export function proxy()` | Next.js 16 (Dec 2025) | File rename + function rename. Codemod available. Runs on Node.js runtime (not Edge). |
| `getSession()` in server code | `getClaims()` (fast) or `getUser()` (authoritative) | Supabase 2025-2026 | getClaims validates JWT locally via JWKS (no network call). Use in proxy. Use getUser() for authoritative checks. |
| `@trpc/react-query` | `@trpc/tanstack-react-query` | tRPC v11 | Package rename. Old package does not exist. |
| `createTRPCProxyClient` | `createTRPCClient` | tRPC v11 | API rename. |
| `trpc.query.useQuery()` | `useTRPC()` + `useQuery(trpc.query.queryOptions())` | tRPC v11 | Query-native pattern with TanStack Query v5. |
| `transformer` on root config only | `transformer` on BOTH `initTRPC.create()` AND each link | tRPC v11 | Must be in both places. TypeScript guides you. |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Supabase 2024 | Complete rewrite. getAll/setAll cookie pattern. |
| `tailwindcss-animate` | `tw-animate-css` | March 2025 | shadcn/ui deprecated old package. |
| `tailwind.config.js` | CSS `@theme inline` | Tailwind v4 | Config moved entirely to CSS. |
| `React.forwardRef` | Plain function components | React 19 | No longer needed. Components use `data-slot`. |
| `hsl(var(--color))` in CSS | `oklch()` values directly in CSS vars | shadcn/ui + Tailwind v4 | Colors include color function in the variable. |
| `isLoading` (React Query) | `isPending` | TanStack Query v5 | Property rename. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 2025-2026 | Both work, new name is forward-compatible. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Removed, use `@supabase/ssr`
- `middleware.ts`: Deprecated in Next.js 16, use `proxy.ts`
- `tailwindcss-animate`: Replaced by `tw-animate-css`
- `@trpc/react-query`: Renamed to `@trpc/tanstack-react-query`
- `@trpc/next`: Pages Router only, do not use with App Router
- Individual cookie methods in Supabase SSR: Use `getAll()`/`setAll()` only
- Sync `cookies()` / `headers()`: Must be awaited in Next.js 16
- `next lint`: Removed in Next.js 16, use ESLint directly
- `serverRuntimeConfig` / `publicRuntimeConfig`: Removed, use env vars

## Design Recommendations (Claude's Discretion)

### Navigation: Sidebar

For the "organic, simple" design language, a collapsible sidebar is recommended:
- **Desktop:** Fixed sidebar (240px) with navigation links. Clean, minimal icons from Lucide.
- **Mobile:** Sheet/drawer that slides in from the left on hamburger tap.
- **Links:** Generate (primary), Documents, History, Profile. Admin link visible only for admin users.
- **Why sidebar over top nav:** Sidebar scales better as features are added, feels less cramped with French labels (which tend to be longer than English), and is the standard shadcn/ui layout pattern.

### Visual Identity

- **Primary color:** Muted green (oklch hue ~160) -- organic, natural, not corporate.
- **Neutrals:** Warm grays (hue ~90) instead of cool grays -- softer, more organic feel.
- **Border radius:** 10px (0.625rem) -- slightly rounded, soft edges. Not too round (childish), not too square (corporate).
- **Typography:** System font stack (default from Next.js). Clean, readable. No custom fonts needed for MVP.
- **Spacing:** Generous padding and margins. Breathable layout. Nothing cramped.
- **Animation:** Subtle transitions only (tw-animate-css defaults). No flashy animations.

### Route Organization

Using Next.js route groups:
- `(auth)` -- Public auth pages (login, callback, error). No app shell.
- `(app)` -- Authenticated pages with sidebar layout. Contains generate, documents, history, profile.
- `(admin)` -- Admin pages with same sidebar but admin-specific navigation.

## Open Questions

Things that could not be fully resolved:

1. **Supabase `getClaims()` return shape**
   - What we know: `getClaims()` is faster than `getUser()` (local JWT validation via JWKS). Supabase officially recommends it for proxy/middleware. The `sub` claim contains the user ID. It handles token refresh automatically.
   - What is unclear: The exact shape of the returned claims object may differ from `getUser()` result. Specifically, `claims?.sub` gives the user UUID.
   - Recommendation: Use `getClaims()` in proxy.ts for speed and token refresh. Use `getUser()` in tRPC context for authoritative validation and to get the full user object.

2. **shadcn/ui + Tailwind v4 exact CSS after init**
   - What we know: `npx shadcn@latest init` auto-detects Tailwind v4 and generates correct CSS with `@custom-variant dark (&:is(.dark *))`.
   - What is unclear: The exact generated CSS may differ from what is documented. The organic color palette will need to be applied AFTER init.
   - Recommendation: Run `shadcn init` first, then customize the generated CSS variables to match the organic palette.

3. **Next.js 16 parallel routes require default.js**
   - What we know: If using parallel routes (modal patterns, etc.), all slots now require explicit `default.tsx` files. Builds fail without them.
   - What is unclear: Whether the route group pattern `(auth)`, `(app)`, `(admin)` counts as parallel routes.
   - Recommendation: Route groups are NOT parallel routes -- they are for layout organization only. No `default.tsx` needed for route groups. Only needed for `@slot` patterns.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Breaking changes, proxy rename, async APIs, React 19.2, Turbopack default
- [Next.js 16 proxy.ts API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- Complete proxy API, matcher config, function signature, limitations
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- All breaking changes, deprecations, removals
- [tRPC v11 Server Components Setup](https://trpc.io/docs/client/tanstack-react-query/server-components) -- File structure, init.ts, server.tsx, client.tsx, prefetching pattern
- [tRPC v11 Data Transformers](https://trpc.io/docs/server/data-transformers) -- superjson configuration on both server AND link
- [tRPC v10 to v11 Migration](https://trpc.io/docs/migrate-from-v10-to-v11) -- Package renames, API changes
- [Supabase SSR Client Creation](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- Three client pattern, PUBLISHABLE_KEY naming
- [Supabase Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- Browser/server/proxy client setup, getClaims recommendation
- [Supabase getClaims() API Reference](https://supabase.com/docs/reference/javascript/auth-getclaims) -- Local JWT validation, JWKS caching, auto token refresh
- [Supabase AI Prompt: Next.js Auth](https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth) -- Complete proxy + server client code
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- Init command, component adding
- [shadcn/ui Tailwind v4 Guide](https://ui.shadcn.com/docs/tailwind-v4) -- @theme inline, OKLCH, tw-animate-css, @custom-variant dark, forwardRef removal

### Secondary (MEDIUM confidence)
- [tRPC v11 Next.js App Router 2026 Guide](https://dev.to/christadrian/mastering-trpc-with-react-server-components-the-definitive-2026-guide-1i2e) -- Community guide, confirmed patterns
- [tRPC v11 transformer Discussion](https://github.com/trpc/trpc/discussions/5570) -- Confirmation that transformer moved to link config
- [Auth0 Next.js 16 Auth Guide](https://auth0.com/blog/whats-new-nextjs-16/) -- CVE-2025-29927 analysis, auth in proxy risks
- [Supabase getClaims vs getUser Discussion](https://github.com/supabase/supabase/issues/40985) -- Clarification on when to use each

### Tertiary (LOW confidence)
- Color palette (organic theme): Based on design principles, not from a specific verified source. Adjust after seeing the result.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All versions verified against npm and official docs. Integration patterns confirmed.
- Architecture: HIGH -- File structure and setup patterns verified against tRPC v11 official docs and Supabase Next.js guide. Both show identical patterns.
- Pitfalls: HIGH -- Verified via CVE-2025-29927, Next.js 16 upgrade guide, tRPC v11 migration guide. Well-documented breaking changes.
- Database schema: HIGH -- Verified against Supabase RLS documentation. Schema from prior architecture research.
- Design recommendations: MEDIUM -- Based on shadcn/ui patterns and design principles. Color palette is subjective.

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (stable technologies, 30-day validity)
