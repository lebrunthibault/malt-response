# Stack Research: MaltResponse

**Project:** MaltResponse - AI-powered job application response generator for Malt.fr
**Researched:** 2026-02-06
**Overall Confidence:** HIGH (all versions verified via npm/official docs within last 48 hours)

---

## Core Framework

### Next.js 16 (App Router)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.1.x (latest stable) | Full-stack React framework | App Router is the standard; Turbopack now default bundler; `proxy.ts` replaces `middleware.ts`; React 19.2 with `use cache` directive | HIGH |
| React | 19.2 (bundled with Next.js 16) | UI rendering | Required by Next.js 16; includes View Transitions, `useEffectEvent()`, `<Activity/>` | HIGH |
| TypeScript | 5.1.0+ (use latest 5.x) | Type safety | Required by Next.js 16; minimum 5.1.0 enforced | HIGH |
| Node.js | 20.9+ LTS | Runtime | Next.js 16 dropped Node 18 support; use latest 20.x or 22.x LTS | HIGH |

**Key Next.js 16 patterns for this project:**

1. **`proxy.ts` replaces `middleware.ts`**: Runs on Node.js runtime (not Edge). Used for auth token refresh and route protection. `middleware.ts` is deprecated and will be removed.
2. **Async params/searchParams**: All dynamic access is now async (`const { id } = await props.params`). The `@next/codemod` handles this automatically.
3. **`use cache` directive**: Explicit opt-in caching replaces the old implicit caching. Dynamic code executes at request time by default. Enable via `cacheComponents: true` in next.config.
4. **React Compiler**: Now stable. Enable with `reactCompiler: true` in next.config. Requires `babel-plugin-react-compiler@latest`.
5. **Turbopack is default**: 2-5x faster builds, up to 10x faster Fast Refresh. Opt out with `--webpack` flag if needed.

**What NOT to use:**
- `middleware.ts` -- deprecated, use `proxy.ts`
- Sync access to `params`, `searchParams`, `cookies()`, `headers()` -- must be async
- `next lint` -- removed in Next.js 16; use ESLint directly
- `serverRuntimeConfig` / `publicRuntimeConfig` -- removed; use env vars
- AMP support -- removed entirely

---

## API Layer

### tRPC v11 + TanStack React Query v5

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @trpc/server | ^11.8.x | Type-safe API server | End-to-end type safety; no code generation; shorthand router syntax in v11 | HIGH |
| @trpc/client | ^11.9.x | Type-safe API client | Pairs with server; httpBatchStreamLink for streaming | HIGH |
| @trpc/tanstack-react-query | ^11.x | React Query integration | Query-native integration; server-side prefetching with RSC; auto-hydration | HIGH |
| @tanstack/react-query | ^5.90.x | Server state management | Caching, deduplication, optimistic updates; Suspense support in v5 | HIGH |
| superjson | ^2.x | Data transformer | Serializes Date, BigInt, Map, etc. across the wire; required for tRPC | HIGH |
| zod | ^3.x | Input validation | Standard for tRPC input schemas; runtime type checking | HIGH |

**Required utility packages:**
- `server-only` -- prevents server code from being imported in client components
- `client-only` -- prevents client code from being imported in server components

**Integration pattern with Next.js 16 App Router:**

```
File structure:
/app
  /api/trpc/[trpc]/route.ts    -- tRPC HTTP handler (fetchRequestHandler)
  layout.tsx                    -- wraps app with TRPCProvider
  page.tsx                      -- uses server-side prefetching
/trpc
  init.ts                       -- initTRPC with context, superjson transformer
  router.ts                     -- appRouter definition
  server.tsx                    -- server-only caller + HydrateClient
  client.tsx                    -- TRPCProvider with QueryClientProvider
  query-client.tsx              -- QueryClient factory with staleTime config
```

**Server-side prefetching pattern (NEW in v11):**
1. In Server Component: call `trpc.myProcedure.prefetch()` to prefetch data
2. Wrap client component with `<HydrateClient>` which dehydrates query state
3. Client component uses `trpc.myProcedure.useQuery()` -- data is already cached, no loading state
4. Uses `queryOptions()` pattern native to TanStack Query v5

**What NOT to use:**
- `@trpc/next` (Pages Router package) -- use `@trpc/tanstack-react-query` for App Router
- `@trpc/react-query` (v10 package) -- renamed to `@trpc/tanstack-react-query` in v11
- `.interop()` mode -- removed in v11; must fully migrate from v9/v10 patterns
- `httpBatchLink` alone -- prefer `httpBatchStreamLink` for streaming support

---

## Database & Auth

### Supabase (PostgreSQL + Auth + Storage)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @supabase/supabase-js | ^2.95.x | Supabase client SDK | PostgreSQL queries, auth, storage, realtime -- all in one | HIGH |
| @supabase/ssr | ^0.8.x | SSR cookie handling | Replaces deprecated `@supabase/auth-helpers-nextjs`; framework-agnostic cookie management for App Router | HIGH |
| Supabase (hosted) | Latest (cloud) | Backend-as-a-service | PostgreSQL + Row Level Security + Auth + Storage + Edge Functions; free tier sufficient for MVP | HIGH |

**Magic link auth setup:**

1. **signInWithOtp()**: Call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '/auth/callback' } })` from a Server Action or client component
2. **Callback route** (`/app/auth/callback/route.ts`): Exchanges the auth code for a session using `supabase.auth.exchangeCodeForSession(code)`
3. **`proxy.ts`**: Refreshes the Supabase auth session on every request; uses `supabase.auth.getUser()` to validate; redirects unauthenticated users to login
4. **Email template**: Customize in Supabase Dashboard > Authentication > Templates; use `{{ .ConfirmationURL }}` for magic link
5. **Rate limit**: Supabase enforces 1 magic link request per 60 seconds per email by default; links expire after 1 hour
6. **Site URL config**: Configure in Dashboard > Authentication > URL Configuration; only whitelisted URLs allowed as redirect targets

**Client creation pattern (2 clients needed):**

```
/lib/supabase/
  client.ts    -- createBrowserClient() from @supabase/ssr (for Client Components)
  server.ts    -- createServerClient() from @supabase/ssr (for Server Components, Server Actions, Route Handlers)
```

**File storage for CV/PDF uploads:**

- Use Supabase Storage (S3-compatible) for file persistence
- Create a `documents` bucket (private by default)
- Upload directly from client to Supabase Storage (bypasses Vercel 4.5MB body limit)
- Use signed upload URLs for security: server generates signed URL, client uploads directly
- RLS policies control who can upload/read files per bucket
- Maximum file size: 50MB on free tier, 5GB on Pro

**PostgreSQL schema patterns:**
- Use Row Level Security (RLS) on all tables
- Create policies per table: `auth.uid() = user_id` pattern
- Use `auth.uid()` function in RLS policies for user-scoped data
- Supabase auto-creates `auth.users` table; extend with `public.profiles` table

**What NOT to use:**
- `@supabase/auth-helpers-nextjs` -- deprecated; use `@supabase/ssr` instead
- `@supabase/auth-helpers-react` -- deprecated; use `@supabase/ssr` instead
- Client-side session management -- let `proxy.ts` + `@supabase/ssr` handle cookies
- `anon` key naming -- Supabase is transitioning to "publishable key" terminology (both work)

---

## UI

### shadcn/ui + Tailwind CSS v4

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| shadcn/ui | Latest (CLI-based, not versioned as npm package) | Component library | Copy-paste components; full control over code; Tailwind v4 + React 19 compatible | HIGH |
| Tailwind CSS | v4.x | Utility-first CSS | CSS-first configuration (no tailwind.config.js); OKLCH colors; faster builds | HIGH |
| tw-animate-css | Latest | Animation utilities | Replaces deprecated `tailwindcss-animate`; used by shadcn/ui components | HIGH |
| tailwind-merge | Latest | Class merging | Utility for merging Tailwind classes without conflicts; `cn()` helper | HIGH |
| clsx | Latest | Conditional classes | Lightweight conditional class joining | HIGH |
| @radix-ui/* | Latest | Primitive components | Accessible, unstyled primitives underlying shadcn/ui components | HIGH |
| lucide-react | Latest | Icons | Default icon set for shadcn/ui | HIGH |

**Tailwind v4 key changes from v3:**

1. **No `tailwind.config.js`**: All configuration happens in CSS using `@theme` directive
2. **CSS variables with `@theme inline`**: Colors defined as CSS variables, mapped via `@theme inline { --color-background: var(--background); }`
3. **OKLCH color space**: HSL colors converted to OKLCH for better color perception
4. **`size-*` utility**: Replaces `w-* h-*` pattern (e.g., `size-4` instead of `w-4 h-4`)
5. **`data-slot` attributes**: Every shadcn/ui primitive has `data-slot` for targeted styling
6. **No `hsl()` wrappers in JS**: Chart configs and JS code reference `var(--chart-1)` directly, not `hsl(var(--chart-1))`

**Setup command:**
```bash
npx create-next-app@latest my-app --ts --tailwind --app
npx shadcn@latest init
# Select "New York" style, and configure theme
```

**What NOT to use:**
- `tailwindcss-animate` -- deprecated; use `tw-animate-css`
- `tailwind.config.js` / `tailwind.config.ts` -- Tailwind v4 uses CSS-first configuration
- `React.forwardRef` -- not needed in React 19; shadcn/ui components use function components with `data-slot`
- Manual `hsl()` wrapping in CSS variables -- colors now include the color function

---

## AI Integration

### Anthropic SDK (Claude Opus 4)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | ^0.72.x | Claude API client | Official TypeScript SDK; streaming support; tool use; batch API | HIGH |

**Server-side usage pattern (tRPC procedure):**

The Anthropic SDK must run server-side only. Use it inside tRPC procedures or Server Actions.

```typescript
// In a tRPC procedure:
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // server-only env var (no NEXT_PUBLIC_ prefix)
});
```

**Streaming pattern for response generation:**

Two approaches for streaming from tRPC to the client:

1. **SSE via tRPC subscriptions** (recommended for tRPC v11):
   - Use `httpBatchStreamLink` on client
   - Define a subscription procedure with generator function
   - Client receives chunks via SSE

2. **Direct streaming via Route Handler** (simpler, bypass tRPC for this endpoint):
   - Create `/app/api/generate/route.ts`
   - Use `anthropic.messages.stream()` helper
   - Return `ReadableStream` response
   - Client uses `fetch()` with `response.body.getReader()`

**Streaming with the SDK:**

```typescript
// Helper-based streaming (recommended):
const stream = anthropic.messages.stream({
  model: 'claude-opus-4-20250514',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
});

// Event-based consumption:
stream.on('text', (text) => { /* send chunk to client */ });
const finalMessage = await stream.finalMessage();
// finalMessage.usage gives input_tokens + output_tokens
```

**Context management for response generation:**
- System prompt: include user profile, past responses tone/style, platform guidelines
- User message: include job offer text, CV content (extracted from PDF), specific instructions
- `max_tokens`: 4096 is generous for a candidature message; 2048 likely sufficient
- Track `usage.input_tokens` and `usage.output_tokens` for cost monitoring

**Model selection:**
- `claude-opus-4-20250514` for highest quality generation (use the model ID, not just "opus 4")
- Consider `claude-sonnet-4-5-20250929` for faster/cheaper generation during development
- Model IDs include dates -- pin to specific version for reproducibility

**What NOT to use:**
- `@ai-sdk/anthropic` (Vercel AI SDK provider) -- adds unnecessary abstraction layer; direct SDK gives more control
- Client-side API calls -- NEVER expose API key in browser; always use server-side
- `anthropic.completions` -- deprecated; use `anthropic.messages` API
- Unbounded `max_tokens` -- always set a reasonable limit to control costs

---

## File Processing

### PDF Parsing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| unpdf | ^1.4.x | PDF text extraction | Modern, serverless-optimized; built on PDF.js v5; works on Vercel/Edge/Node; actively maintained (UnJS ecosystem) | HIGH |

**Why unpdf over alternatives:**

| Library | Verdict | Reason |
|---------|---------|--------|
| **unpdf** | RECOMMENDED | Serverless-native; ships optimized PDF.js build; works across all JS runtimes; actively maintained by UnJS |
| pdf-parse | NOT recommended | Known Vercel deployment bug (references test file `./test/data/05-versions-space.pdf`); requires `serverExternalPackages` workaround; unmaintained (original package) |
| pdfjs-dist | NOT recommended | 2MB+ bundle size impacts serverless cold starts; needs manual worker configuration; overkill for text extraction |
| pdf2json | NOT recommended | Designed for structured/coordinate data extraction; overkill for simple text extraction from CVs |

**Implementation pattern:**

```typescript
import { extractText } from 'unpdf';

export async function parsePDF(buffer: ArrayBuffer): Promise<string> {
  const { text } = await extractText(buffer);
  return text;
}
```

**Vercel constraints for file upload + parsing:**

| Constraint | Limit | Workaround |
|-----------|-------|------------|
| Serverless function body size | 4.5 MB | Upload directly to Supabase Storage, then parse from URL/signed URL |
| Serverless function timeout | 300s (Hobby) / 800s (Pro) | PDF parsing is fast; not a concern |
| Serverless function bundle size | 250 MB (uncompressed) | unpdf is lightweight (~2MB with PDF.js) |
| Serverless function memory | 2 GB (Hobby) / 4 GB (Pro) | Sufficient for PDF parsing |

**Recommended upload flow:**
1. Client selects file via `<input type="file">` or drag-and-drop (react-dropzone)
2. Client requests signed upload URL from server (tRPC mutation)
3. Client uploads file directly to Supabase Storage using signed URL (bypasses Vercel body limit)
4. Server-side tRPC procedure downloads file from Supabase Storage, parses with unpdf
5. Extracted text stored in database for reuse in prompt construction

**What NOT to use:**
- Routing file uploads through Vercel serverless functions -- hits 4.5MB body limit
- `pdf-parse` (original GitLab package) -- Vercel deployment issues; unmaintained
- Browser-side PDF parsing -- unreliable; server-side gives consistent results
- Storing raw PDF text in the prompt without truncation -- CVs can be long; extract relevant sections

---

## Infrastructure

### Rate Limiting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @upstash/ratelimit | ^2.0.x | Rate limiting | Serverless-native; sliding window algorithm; works with Vercel Edge and Node.js; caches in-memory when function is hot | HIGH |
| @upstash/redis | Latest | Redis client for rate limiting | Required by @upstash/ratelimit; REST-based (no TCP needed in serverless) | HIGH |

**Why Upstash over alternatives:**

| Approach | Verdict | Reason |
|---------|---------|--------|
| **Upstash Redis** | RECOMMENDED | Serverless-native; REST-based (no TCP connections); free tier generous (10K commands/day); built-in rate limit library |
| Supabase (database counter) | NOT recommended | Database queries for every rate check add latency; no built-in sliding window |
| In-memory Map | NOT recommended | Resets on cold start; doesn't work across function instances |
| Vercel KV | Acceptable alternative | Built on Upstash Redis anyway; less flexible API |

**Implementation for "3 generations per day" limit:**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Declare outside handler for caching across invocations
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(), // uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(3, '1 d'), // 3 requests per day
  analytics: true,
  prefix: 'maltresponse:generate',
});

// In tRPC procedure:
const { success, remaining, reset } = await ratelimit.limit(userId);
if (!success) {
  // Calculate reset time, trigger email notification
  throw new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message: `Daily limit reached. Resets at ${new Date(reset).toLocaleString()}`,
  });
}
```

**Rate limiting placement:**
- Apply in tRPC procedure (not `proxy.ts`) -- need user ID from auth context
- Use `userId` as identifier (not IP) -- users may share IP; rate limit is per-user
- `proxy.ts` can add a global IP-based rate limit for DDoS protection (separate from per-user limit)

**Upstash free tier:** 10,000 commands/day, 256MB storage -- more than sufficient for this project.

### Email Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| resend | Latest | Transactional email sending | First-class Next.js/Vercel integration; React Email templates; generous free tier (3,000/month, 100/day) | HIGH |
| @react-email/components | Latest | Email templates | Build email templates with React components; used by Vercel themselves | MEDIUM |

**Why Resend over alternatives:**

| Service | Verdict | Reason |
|---------|---------|--------|
| **Resend** | RECOMMENDED | Built for developers; React Email support; simple API; 3,000 emails/month free |
| Supabase (built-in email) | NOT recommended for custom emails | Supabase emails are for auth only (magic links, confirmations); cannot send arbitrary emails |
| Nodemailer + SMTP | NOT recommended | Requires SMTP server; connection pooling issues in serverless |
| SendGrid | Acceptable alternative | More complex setup; better for high volume; overkill for notifications |

**Implementation pattern:**

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// In rate limit handler:
await resend.emails.send({
  from: 'MaltResponse <noreply@yourdomain.com>',
  to: userEmail,
  subject: 'Limite quotidienne atteinte',
  react: RateLimitEmailTemplate({ resetTime, remaining: 0 }),
});
```

**Resend free tier limits:** 3,000 emails/month, 100 emails/day. For a rate-limit notification system (max 1 email per user per day), this is more than sufficient.

**What NOT to use:**
- Supabase Auth emails for custom notifications -- only for auth flows
- Nodemailer in serverless -- TCP connection issues; cold start penalties
- Client-side email sending -- exposes API keys

---

## Deployment

### Vercel

| Constraint | Hobby Plan | Pro Plan | Notes |
|-----------|------------|----------|-------|
| Serverless function body | 4.5 MB | 4.5 MB | Upload files to Supabase Storage directly |
| Serverless function duration | 300s (5 min) | 800s (13 min) | Claude streaming may need up to 60s; well within limits |
| Serverless function memory | 2 GB / 1 vCPU | 4 GB / 2 vCPU | Sufficient for PDF parsing + API calls |
| Serverless function bundle | 250 MB uncompressed | 250 MB uncompressed | Monitor with unpdf + Anthropic SDK |
| Edge function initial response | 25s | 25s | Can stream for up to 300s after |
| Concurrent executions | Up to 30,000 | Up to 30,000 | Auto-scales |
| File descriptors | 1,024 shared | 1,024 shared | Use connection pooling |

**Vercel-specific configuration:**

```typescript
// next.config.ts
const nextConfig = {
  // If pdf libraries need Node.js APIs:
  serverExternalPackages: ['unpdf'],
};
```

**Fluid Compute:** Enabled by default on new projects. Functions pay for active CPU time only (waiting for Claude API or DB queries does not count). This is ideal for AI workloads with long I/O waits.

**Environment variables to configure:**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, for admin operations

# Anthropic
ANTHROPIC_API_KEY=                 # server-only

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Resend
RESEND_API_KEY=                    # server-only

# App
NEXT_PUBLIC_APP_URL=               # for auth redirects
```

---

## Complete Installation

```bash
# Create Next.js 16 project
npx create-next-app@latest maltresponse --ts --tailwind --app

# Initialize shadcn/ui
npx shadcn@latest init

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query
npm install @anthropic-ai/sdk
npm install @upstash/ratelimit @upstash/redis
npm install resend
npm install unpdf
npm install zod superjson

# Utility packages
npm install server-only client-only

# Dev dependencies
npm install -D @tanstack/react-query-devtools
npm install -D babel-plugin-react-compiler  # if enabling React Compiler
```

---

## Integration Gotchas

### 1. proxy.ts + Supabase Auth Token Refresh
**Issue:** `proxy.ts` runs on Node.js runtime (not Edge like old `middleware.ts`). Supabase auth token refresh must happen here.
**Solution:** The `@supabase/ssr` `createServerClient` works in Node.js runtime. Create the Supabase client in `proxy.ts` with cookie getters/setters from the request/response objects.
**Confidence:** HIGH

### 2. tRPC + Streaming Claude Responses
**Issue:** tRPC procedures return complete responses by default; streaming requires special handling.
**Solution:** Two options:
- (A) Use tRPC subscriptions with `httpBatchStreamLink` and SSE for real-time streaming
- (B) Use a separate Route Handler (`/api/generate/route.ts`) that returns a `ReadableStream` for the Claude streaming response, while keeping other CRUD operations in tRPC
Option B is simpler and avoids coupling AI streaming to tRPC's subscription model.
**Confidence:** MEDIUM (both patterns work; B is more proven for AI streaming)

### 3. File Upload Flow: Client -> Supabase Storage -> Server Parse
**Issue:** Vercel serverless functions have a 4.5MB body size limit. CV PDFs can exceed this.
**Solution:** Never route file uploads through Vercel functions. Upload directly from client to Supabase Storage using signed URLs, then have the server-side code download and parse from Storage.
**Confidence:** HIGH

### 4. Supabase Auth in tRPC Context
**Issue:** tRPC procedures need the authenticated user. The Supabase session comes from cookies.
**Solution:** In tRPC `createContext`, create a Supabase server client, call `supabase.auth.getUser()`, and pass the user to the tRPC context. Use `protectedProcedure` middleware that checks `ctx.user`.
**Confidence:** HIGH

### 5. unpdf in Vercel Serverless
**Issue:** Some PDF libraries fail in serverless due to missing binaries or test file references.
**Solution:** unpdf is specifically designed for serverless. If bundling issues occur, add `unpdf` to `serverExternalPackages` in `next.config.ts`.
**Confidence:** HIGH

### 6. Tailwind v4 CSS Variables + shadcn/ui Theming
**Issue:** Tailwind v4 uses CSS-first config; old `tailwind.config.js` patterns don't work.
**Solution:** Use `npx shadcn@latest init` which auto-detects Tailwind v4 and generates correct CSS. Theme customization happens in the main CSS file using `@theme inline`, not in a config file.
**Confidence:** HIGH

### 7. React Query Hydration with tRPC v11
**Issue:** Server-prefetched data must be correctly hydrated on the client to avoid refetching.
**Solution:** Use the `HydrateClient` component from tRPC's server helper. Wrap the client component tree, and the prefetched data automatically populates the React Query cache.
**Confidence:** HIGH

### 8. Supabase RLS + tRPC
**Issue:** If using both tRPC auth middleware AND Supabase RLS, you have two layers of auth checking.
**Solution:** Use both intentionally:
- tRPC `protectedProcedure` middleware validates the user exists (fast, no DB call)
- Supabase RLS enforces row-level access at the database level (defense in depth)
This is correct architecture, not redundancy.
**Confidence:** HIGH

### 9. Claude API Costs
**Issue:** Opus 4 is expensive. Uncontrolled usage can rack up costs quickly.
**Solution:**
- Rate limit at 3 generations/day per user (Upstash)
- Set `max_tokens` to 2048-4096 (candidature messages are short)
- Log `usage.input_tokens` and `usage.output_tokens` per generation
- Consider Sonnet 4.5 for development/testing (cheaper, faster)
- Admin panel should show aggregate token usage
**Confidence:** HIGH

### 10. Next.js 16 Parallel Routes Require default.js
**Issue:** If using parallel routes (e.g., modal patterns), all slots now require explicit `default.js` files. Builds fail without them.
**Solution:** Add `default.tsx` to every parallel route slot. This is a Next.js 16 breaking change.
**Confidence:** HIGH

---

## Sources

### Official Documentation (HIGH confidence)
- Next.js 16 Blog Post: https://nextjs.org/blog/next-16
- tRPC v11 Announcement: https://trpc.io/blog/announcing-trpc-v11
- tRPC Next.js Integration: https://trpc.io/docs/client/nextjs
- Supabase Auth for Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Auth Quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- shadcn/ui Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4
- shadcn/ui Next.js Install: https://ui.shadcn.com/docs/installation/next
- Anthropic SDK TypeScript: https://github.com/anthropics/anthropic-sdk-typescript
- Vercel Functions Limits: https://vercel.com/docs/functions/limitations
- Resend Next.js Guide: https://resend.com/docs/send-with-nextjs
- unpdf GitHub: https://github.com/unjs/unpdf
- Upstash Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

### npm Version Verification (HIGH confidence, checked 2026-02-06)
- @anthropic-ai/sdk: 0.72.1 -- https://www.npmjs.com/package/@anthropic-ai/sdk
- @supabase/supabase-js: 2.95.2 -- https://www.npmjs.com/package/@supabase/supabase-js
- @supabase/ssr: 0.8.0 -- https://www.npmjs.com/package/@supabase/ssr
- @trpc/server: 11.8.1 -- https://www.npmjs.com/package/@trpc/server
- @trpc/client: 11.9.0 -- https://www.npmjs.com/package/@trpc/client
- @tanstack/react-query: 5.90.19 -- https://www.npmjs.com/package/@tanstack/react-query
- @upstash/ratelimit: 2.0.8 -- https://www.npmjs.com/package/@upstash/ratelimit
- unpdf: 1.4.0 -- https://www.npmjs.com/package/unpdf

### Community Guides (MEDIUM confidence)
- tRPC 11 Setup for Next.js App Router 2025: https://dev.to/matowang/trpc-11-setup-for-nextjs-app-router-2025-33fo
- Supabase Magic Link for Next.js: https://nextjsstarter.com/blog/supabase-magic-link-simplified-for-nextjs/
- Upstash Edge Rate Limiting: https://upstash.com/blog/edge-rate-limiting
