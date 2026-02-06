# Architecture Research

**Project:** MaltResponse
**Domain:** AI-powered SaaS - Job application response generator
**Stack:** Next.js 16 (App Router) + tRPC v11 + Supabase + Anthropic Claude SDK + Vercel
**Researched:** 2026-02-06
**Overall confidence:** HIGH (all components verified against official docs)

---

## System Overview

MaltResponse is a server-first Next.js application. The architecture follows the "thin client, thick server" pattern enabled by React Server Components. All sensitive operations (AI generation, auth validation, file processing) happen server-side. The client handles form interactions and displays streamed AI responses.

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL (Edge + Serverless)        │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Next.js      │    │  tRPC API Layer           │   │
│  │  Middleware    │───>│  /api/trpc/[trpc]         │   │
│  │  (auth gate)  │    │                            │   │
│  └──────────────┘    │  ┌─────────┐ ┌──────────┐ │   │
│                       │  │ user    │ │ document │ │   │
│  ┌──────────────┐    │  │ router  │ │ router   │ │   │
│  │  App Router   │    │  ├─────────┤ ├──────────┤ │   │
│  │  Pages (RSC)  │───>│  │ offer   │ │ generate │ │   │
│  │  + Client     │    │  │ router  │ │ router   │ │   │
│  │  Components   │    │  ├─────────┤ ├──────────┤ │   │
│  └──────────────┘    │  │ admin   │ │ response │ │   │
│                       │  │ router  │ │ router   │ │   │
│                       │  └─────────┘ └──────────┘ │   │
│                       └──────────────────────────┘   │
└───────────────┬──────────────┬────────────────────────┘
                │              │
       ┌────────▼──────┐  ┌───▼──────────────┐
       │   Supabase     │  │  Anthropic API    │
       │                │  │  (Claude)          │
       │  ┌──────────┐  │  └──────────────────┘
       │  │ Auth      │  │
       │  │ (magic    │  │
       │  │  link)    │  │
       │  ├──────────┤  │
       │  │ PostgreSQL│  │
       │  │ (data +   │  │
       │  │  RLS)     │  │
       │  ├──────────┤  │
       │  │ Storage   │  │
       │  │ (PDFs)    │  │
       │  └──────────┘  │
       └────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Next.js Middleware | Auth token refresh, route protection | Supabase Auth, App Router |
| App Router (RSC) | Page rendering, server-side data prefetch | tRPC server caller, Supabase client |
| Client Components | Forms, streaming display, interactions | tRPC client hooks (React Query) |
| tRPC API Layer | All business logic, validation, auth checks | Supabase DB, Supabase Storage, Claude API |
| Supabase Auth | Magic link emails, session management, JWT | Next.js Middleware, tRPC context |
| Supabase PostgreSQL | Data persistence, RLS enforcement | tRPC procedures (via supabase-js) |
| Supabase Storage | PDF file storage, access control | tRPC document procedures |
| Anthropic Claude API | AI text generation | tRPC generate procedures |

---

## Database Schema

All tables live in Supabase PostgreSQL. Row Level Security (RLS) is enabled on every table. The `auth.users` table is managed by Supabase Auth -- we extend it with a `profiles` table.

### Table: `profiles`

Extends `auth.users`. Created automatically via a database trigger on user signup.

```sql
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

-- RLS: users see own profile, admins see all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policies use service_role on the server side, not RLS
```

### Table: `documents`

User-uploaded files (CV, past responses, profile descriptions). Stores metadata; actual files are in Supabase Storage.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('cv', 'past_response', 'profile_info', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,           -- path in Supabase Storage bucket
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  extracted_text TEXT,               -- text extracted from PDF (nullable until processed)
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_user_doc_type ON documents(user_id, doc_type);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);
```

### Table: `job_offers`

Stores pasted job offer data before generation. Kept for history and re-generation.

```sql
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,                         -- optional job title
  description TEXT NOT NULL,          -- the pasted job offer text
  company_name TEXT,
  company_description TEXT,           -- optional company context
  company_website TEXT,               -- optional URL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_offers_user_id ON job_offers(user_id);

ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own job offers"
  ON job_offers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Table: `responses`

Generated candidature messages. Links back to the job offer and captures prompt/model metadata for auditability.

```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  generated_text TEXT NOT NULL,
  model_used TEXT NOT NULL,           -- e.g. 'claude-sonnet-4-20250514'
  input_tokens INTEGER,
  output_tokens INTEGER,
  generation_time_ms INTEGER,         -- wall-clock time for generation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responses_user_id ON responses(user_id);
CREATE INDEX idx_responses_job_offer_id ON responses(job_offer_id);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses"
  ON responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Table: `generation_logs`

Tracks daily usage for rate limiting and admin stats. One row per day per user.

```sql
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
  ON generation_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/update handled by server-side service_role client
```

### Admin Data Access Pattern

Admin operations bypass RLS by using a **service_role Supabase client** created server-side only. This client is never exposed to the browser.

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import 'server-only'; // prevents accidental client-side import

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NEVER NEXT_PUBLIC_
);
```

The admin tRPC procedures verify `is_admin` from the profile before executing queries with `supabaseAdmin`.

---

## File Storage

### Supabase Storage Architecture

**Bucket:** `user-documents` (private, RLS-protected)

Storage path convention: `{user_id}/{doc_type}/{filename}`

Example: `a1b2c3d4/cv/john-doe-cv-2026.pdf`

```sql
-- Storage RLS policies
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

### PDF Text Extraction Pipeline

Text extraction happens **server-side in the tRPC procedure** immediately after upload, not as a background job. This keeps the architecture simple and avoids needing a queue system.

```
User uploads PDF
       │
       ▼
tRPC document.upload procedure
       │
       ├─1─► Upload file to Supabase Storage
       │     (supabase.storage.from('user-documents').upload(...))
       │
       ├─2─► Insert document row (extraction_status = 'processing')
       │
       ├─3─► Download file buffer from Storage
       │     (supabase.storage.from('user-documents').download(...))
       │
       ├─4─► Extract text using pdf-parse
       │     (pdf-parse works in Node.js serverless functions)
       │
       ├─5─► UPDATE document SET extracted_text = ..., extraction_status = 'completed'
       │
       └─6─► Return document metadata to client
```

**Library choice:** `pdf-parse` (v2.x) -- pure TypeScript, works in Vercel serverless functions, no native dependencies. Handles standard PDFs well. For scanned PDFs (images), text extraction will fail gracefully and the user will be prompted to paste the text manually.

**Confidence:** HIGH -- pdf-parse is widely used in serverless environments and verified on Vercel.

**Text storage:** Extracted text is stored in the `documents.extracted_text` column. This avoids re-extracting on every generation and keeps context assembly fast. Text is plain UTF-8, stripped of formatting.

**File size limits:** Enforce 10MB max at upload (Vercel serverless body limit is 4.5MB by default on hobby, configurable on Pro; use Supabase Storage client-side upload with signed URLs to bypass this).

### Client-Side Upload Pattern (recommended for large files)

```
Client                          tRPC                        Supabase Storage
  │                               │                               │
  ├─1─ document.getUploadUrl() ──►│                               │
  │                               ├─── create signed upload URL ──►│
  │    ◄── signed URL ────────────┤                               │
  │                               │                               │
  ├─2─ PUT file directly ─────────────────────────────────────────►│
  │                               │                               │
  ├─3─ document.confirmUpload() ─►│                               │
  │                               ├─── verify file exists ────────►│
  │                               ├─── extract text (pdf-parse)   │
  │                               ├─── insert document row        │
  │    ◄── document metadata ─────┤                               │
```

This pattern avoids routing the file through the Vercel serverless function, staying within Supabase's generous storage limits.

---

## Auth Flow

### Magic Link Flow with Next.js + Supabase

**Packages:** `@supabase/supabase-js`, `@supabase/ssr`

```
User enters email
       │
       ▼
Client calls supabase.auth.signInWithOtp({ email })
       │
       ▼
Supabase sends magic link email
       │
       ▼
User clicks link → redirected to /auth/callback
       │
       ▼
/auth/callback route handler exchanges code for session
       │
       ├─► Sets auth cookies via supabase.auth.exchangeCodeForSession()
       │
       └─► Redirects to /dashboard
```

### Three Supabase Clients

The architecture requires three distinct Supabase client instances:

1. **Browser client** (`lib/supabase/client.ts`) -- for client components, uses `createBrowserClient` from `@supabase/ssr`. Reads cookies from the browser.

2. **Server client** (`lib/supabase/server.ts`) -- for Server Components, Route Handlers, Server Actions. Uses `createServerClient` from `@supabase/ssr`. Reads cookies from the request.

3. **Admin client** (`lib/supabase/admin.ts`) -- for admin operations. Uses `createClient` with `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS. Protected with `import 'server-only'`.

### Middleware

The middleware refreshes auth tokens on every request and protects routes:

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: use getUser(), not getSession() -- getUser() validates with Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser();

  // Protect all routes except auth pages and public pages
  if (!user && !request.nextUrl.pathname.startsWith('/auth') && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
};
```

**Security note (HIGH confidence, from official Supabase docs):** Never trust `supabase.auth.getSession()` inside server code. Always use `supabase.auth.getUser()` which validates the JWT with the Supabase Auth server on every call.

### Auth Callback Route Handler

```typescript
// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(/* ... cookie config ... */);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
```

---

## API Layer (tRPC)

### Project Structure

```
src/
├── trpc/
│   ├── init.ts              # initTRPC, context creation, base procedures
│   ├── routers/
│   │   ├── _app.ts          # root appRouter (merges all sub-routers)
│   │   ├── user.ts          # profile management
│   │   ├── document.ts      # file upload, list, delete, text extraction
│   │   ├── offer.ts         # job offer CRUD
│   │   ├── generate.ts      # AI generation (main feature)
│   │   ├── response.ts      # response history
│   │   └── admin.ts         # admin-only procedures
│   ├── client.tsx           # TRPCReactProvider, client hooks
│   ├── server.tsx           # server-side caller (for RSC prefetching)
│   └── query-client.ts      # React Query configuration
├── app/
│   ├── api/trpc/[trpc]/route.ts  # tRPC HTTP handler
│   ├── (auth)/                    # auth pages (login, callback, error)
│   ├── (app)/                     # authenticated app pages
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── generate/
│   │   ├── history/
│   │   └── settings/
│   └── (admin)/                   # admin pages
│       └── admin/
│           ├── users/
│           └── stats/
└── lib/
    ├── supabase/
    │   ├── client.ts          # browser client
    │   ├── server.ts          # server client
    │   └── admin.ts           # service_role admin client
    ├── ai/
    │   ├── claude.ts          # Anthropic client initialization
    │   ├── prompts.ts         # prompt templates
    │   └── context-builder.ts # assembles user context for generation
    └── pdf/
        └── extract.ts         # pdf-parse wrapper
```

### tRPC Initialization and Context

```typescript
// trpc/init.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import superjson from 'superjson';
import { createServerClient } from '@supabase/ssr';

export const createTRPCContext = cache(async (opts: { headers: Headers }) => {
  // Create Supabase server client from request cookies
  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();

  return {
    supabase,
    user,        // null if not authenticated
    headers: opts.headers,
  };
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Authenticated procedure -- reusable middleware
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  // Fetch profile to check disabled status
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('*')
    .eq('id', ctx.user.id)
    .single();

  if (!profile || profile.is_disabled) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Account disabled' });
  }
  return next({ ctx: { ...ctx, user: ctx.user, profile } });
});

// Admin procedure
export const adminProcedure = authedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.profile.is_admin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
```

### Router: `user.ts`

```typescript
// Procedures:
user.getProfile       // query  - returns current user profile
user.updateProfile    // mutation - update display_name
user.deleteAccount    // mutation - delete user and all data
```

### Router: `document.ts`

```typescript
// Procedures:
document.list              // query    - list user's documents, filterable by doc_type
document.getUploadUrl      // mutation - returns signed upload URL for client-side upload
document.confirmUpload     // mutation - verify upload, extract text, insert document row
document.delete            // mutation - delete file from Storage + row from DB
document.getExtractedText  // query    - get extracted text for a document
```

### Router: `offer.ts`

```typescript
// Procedures:
offer.create    // mutation - save job offer data
offer.list      // query    - list user's past job offers
offer.getById   // query    - get single offer with associated responses
offer.delete    // mutation - delete offer and associated responses
```

### Router: `generate.ts`

This is the core router. It handles rate limiting, context assembly, and AI generation.

```typescript
// Procedures:
generate.create   // mutation - main generation endpoint
                  //   1. Check rate limit (3/day)
                  //   2. Save job offer
                  //   3. Assemble context (user docs + offer)
                  //   4. Call Claude API
                  //   5. Save response
                  //   6. Increment daily counter
                  //   7. Return generated text + metadata

generate.stream   // subscription (SSE) - same as create but streams response
                  //   Uses tRPC subscription with async generator
                  //   Yields text chunks as Claude generates them
```

### Router: `response.ts`

```typescript
// Procedures:
response.list       // query    - paginated response history
response.getById    // query    - single response with associated offer
response.delete     // mutation - delete a response
```

### Router: `admin.ts`

All procedures use `adminProcedure` base. Uses `supabaseAdmin` (service_role) to bypass RLS.

```typescript
// Procedures:
admin.listUsers        // query    - paginated user list with stats
admin.getUserDetail    // query    - single user with all documents, offers, responses
admin.disableUser      // mutation - set is_disabled = true
admin.enableUser       // mutation - set is_disabled = false
admin.resetUserLimit   // mutation - reset daily_generation_count to 0
admin.getStats         // query    - aggregate stats (total users, generations today, etc.)
admin.setAdmin         // mutation - grant/revoke admin role
```

### Client-Side Setup

Use `httpBatchStreamLink` for streaming support. This link batches requests but streams responses as soon as data is available -- required for the AI generation streaming feature.

```typescript
// trpc/client.tsx (simplified)
import { createTRPCClient, httpBatchStreamLink } from '@trpc/client';
import superjson from 'superjson';

function makeClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchStreamLink({
        url: '/api/trpc',
        transformer: superjson,
      }),
    ],
  });
}
```

---

## AI Generation Pipeline

### Context Assembly

The context builder collects all relevant user data and structures it for the prompt. Token management is critical -- Claude has context limits and we need to leave room for the response.

```
User's documents                     Job offer data
├── CV (extracted_text)              ├── description (pasted text)
├── Past responses (extracted_text)  ├── company_name
├── Profile info (extracted_text)    ├── company_description
└── Other docs (extracted_text)      └── company_website
         │                                    │
         └──────────┬─────────────────────────┘
                    │
                    ▼
           Context Builder
           ├── Prioritize: CV > past responses > profile info
           ├── Truncate if total exceeds token budget
           ├── Structure into prompt sections
           └── Estimate token count
                    │
                    ▼
           Prompt Assembly
           ├── System prompt (fixed template)
           ├── User context section
           ├── Job offer section
           └── Generation instructions
                    │
                    ▼
           Claude API Call
           ├── model: claude-sonnet-4-20250514 (balanced cost/quality)
           ├── max_tokens: 2048 (response is a message, not a novel)
           ├── temperature: 0.7 (some creativity, not too random)
           └── stream: true
```

### Token Budget Management

Use a simple character-based estimation (1 token ~= 4 characters for French/English text). No need for a tokenizer library for this use case.

```typescript
// lib/ai/context-builder.ts
const MAX_CONTEXT_TOKENS = 8000;    // leave room in Claude's context window
const MAX_RESPONSE_TOKENS = 2048;
const SYSTEM_PROMPT_TOKENS = 500;   // estimated fixed overhead

const PRIORITY_ORDER = ['cv', 'past_response', 'profile_info', 'other'] as const;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildContext(documents: Document[], offer: JobOffer): PromptContext {
  let remainingBudget = MAX_CONTEXT_TOKENS - SYSTEM_PROMPT_TOKENS;

  // Always include job offer first (it's the primary input)
  const offerText = formatOffer(offer);
  remainingBudget -= estimateTokens(offerText);

  // Add documents by priority, truncating if needed
  const includedDocs: string[] = [];
  for (const docType of PRIORITY_ORDER) {
    const docs = documents.filter(d => d.doc_type === docType && d.extracted_text);
    for (const doc of docs) {
      const tokens = estimateTokens(doc.extracted_text);
      if (tokens <= remainingBudget) {
        includedDocs.push(formatDocument(doc));
        remainingBudget -= tokens;
      } else if (remainingBudget > 200) {
        // Truncate to fit
        const chars = remainingBudget * 4;
        includedDocs.push(formatDocument(doc, chars));
        remainingBudget = 0;
        break;
      }
    }
    if (remainingBudget <= 0) break;
  }

  return { offerText, includedDocs };
}
```

### Prompt Structure

```typescript
// lib/ai/prompts.ts
function buildGenerationPrompt(context: PromptContext): Message[] {
  return [
    {
      role: 'user',
      content: `
## Contexte du candidat

### CV
${context.cvText || 'Non fourni'}

### Exemples de candidatures precedentes
${context.pastResponses || 'Non fournis'}

### Informations de profil
${context.profileInfo || 'Non fournies'}

---

## Offre de mission

${context.offerText}

${context.companyDescription ? `### A propos de l'entreprise\n${context.companyDescription}` : ''}
${context.companyWebsite ? `### Site web de l'entreprise: ${context.companyWebsite}` : ''}

---

## Instructions

Redige un message de candidature personnalise pour cette offre de mission sur Malt.
- Le ton doit etre professionnel mais naturel, pas trop formel
- Mentionne les competences du candidat pertinentes pour cette offre
- Si des exemples de candidatures precedentes sont fournis, inspire-toi du style et du ton
- Le message doit faire entre 150 et 300 mots
- Ne commence pas par "Objet:" ou "Madame, Monsieur"
- Commence directement par le contenu du message, comme si c'etait un message sur une plateforme
      `.trim(),
    },
  ];
}
```

### Model Selection

**Recommendation:** `claude-sonnet-4-20250514`

- Best balance of quality and cost for text generation
- Fast enough for streaming (2-5 seconds for a 200-word response)
- Significantly cheaper than Opus for this use case
- Output quality is excellent for professional writing tasks

Store the model name in an environment variable (`CLAUDE_MODEL`) so it can be changed without code deployment.

### Streaming Implementation

For streaming, use a tRPC subscription with SSE transport via `httpBatchStreamLink`:

```typescript
// trpc/routers/generate.ts (streaming approach)
generate.stream = authedProcedure
  .input(z.object({ jobOfferId: z.string().uuid() }))
  .subscription(async function* ({ ctx, input }) {
    // 1. Rate limit check
    // 2. Fetch job offer and user documents
    // 3. Build context and prompt
    // 4. Stream from Claude
    const stream = anthropic.messages.stream({
      model: process.env.CLAUDE_MODEL!,
      max_tokens: MAX_RESPONSE_TOKENS,
      messages: buildGenerationPrompt(context),
    });

    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        yield { type: 'text_delta' as const, text: event.delta.text };
      }
    }

    // 5. Save response to DB after stream completes
    const finalMessage = await stream.finalMessage();
    // ... save to responses table

    yield {
      type: 'complete' as const,
      responseId: savedResponse.id,
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
  });
```

**Alternative (simpler, non-streaming):** If SSE subscriptions prove problematic on Vercel, fall back to a standard mutation that returns the full response after generation. The generation time is 2-5 seconds which is acceptable with a loading indicator.

**Confidence:** MEDIUM -- tRPC SSE subscriptions on Vercel serverless require the response to keep the connection alive for the duration of the stream. This works but may hit Vercel's function timeout (default 10s on Hobby, 60s on Pro). The non-streaming fallback is the safer initial approach. Streaming can be added later.

**Recommended initial approach:** Start with the non-streaming mutation. Add streaming as an enhancement after the core flow works.

---

## Rate Limiting

### Architecture Decision: PostgreSQL, Not Redis

For 3 generations/day per user, PostgreSQL (via Supabase) is sufficient. Adding Redis/Upstash would introduce infrastructure complexity for a trivially simple counter. Redis-based rate limiting is designed for high-throughput APIs (thousands of requests/second). This app has tens of users making a few requests per day.

### Enforcement Point

Rate limiting is enforced **inside the tRPC `generate.create` procedure**, not in middleware. This is because:
1. Only the generation endpoint needs rate limiting
2. The limit is per-user per-day (requires knowing the user)
3. It must be atomic with the generation itself

### Tracking Mechanism

Use the `generation_logs` table with an `UPSERT` pattern:

```typescript
// Inside generate.create procedure
async function checkAndIncrementRateLimit(
  supabase: SupabaseClient,
  userId: string,
  maxPerDay: number = 3
): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];

  // Atomic check-and-increment using a database function
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_date: today,
    p_max_count: maxPerDay,
  });

  return {
    allowed: data.allowed,
    remaining: data.remaining,
  };
}
```

```sql
-- Database function for atomic rate limit check
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_date DATE,
  p_max_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Upsert: insert or increment
  INSERT INTO generation_logs (user_id, generation_date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, generation_date)
  DO UPDATE SET count = generation_logs.count + 1
  RETURNING count INTO v_count;

  -- If over limit, roll back the increment
  IF v_count > p_max_count THEN
    UPDATE generation_logs
    SET count = count - 1
    WHERE user_id = p_user_id AND generation_date = p_date;

    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', p_max_count - v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Email Notification on Limit Reached

When a user hits their daily limit, trigger an email notification. Two options:

1. **Supabase Edge Function + webhook:** Create a database trigger on `generation_logs` that fires when `count = max_count`. The trigger calls a Supabase Edge Function that sends the email via Resend/SendGrid.

2. **Application-level (simpler):** After the rate limit check returns `remaining: 0`, call the email service directly from the tRPC procedure.

**Recommendation:** Option 2 (application-level) for simplicity. Use Resend (simple API, generous free tier, works well with Vercel).

---

## Admin Panel

### Architecture: Same App, Protected Routes

The admin panel lives in the same Next.js application under `/admin/*` routes. No separate deployment needed. Advantages:
- Shares auth infrastructure
- Shares tRPC client and types
- Single deployment
- Simpler to maintain

### Route Protection

Admin routes are protected at two levels:

1. **Middleware level:** Check `is_admin` on the profile for any `/admin/*` route.
2. **tRPC level:** All admin procedures use `adminProcedure` which checks `is_admin`.

```typescript
// In middleware.ts, add admin check:
if (request.nextUrl.pathname.startsWith('/admin')) {
  // Fetch profile to check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

### Admin Pages

```
/admin
├── /admin/users          # paginated user list (email, signup date, generation count, status)
├── /admin/users/[id]     # single user detail (documents, offers, responses, actions)
└── /admin/stats          # aggregate dashboard (total users, generations/day chart, active users)
```

### Admin Data Access

Admin tRPC procedures use `supabaseAdmin` (service_role client) to bypass RLS and query all users' data:

```typescript
// trpc/routers/admin.ts
admin.listUsers = adminProcedure
  .input(z.object({
    page: z.number().default(1),
    pageSize: z.number().default(20),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    let query = supabaseAdmin
      .from('profiles')
      .select('*, generation_logs(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((input.page - 1) * input.pageSize, input.page * input.pageSize - 1);

    if (input.search) {
      query = query.ilike('email', `%${input.search}%`);
    }

    return query;
  });
```

---

## Data Flow

### End-to-End: User Input to Generated Response

```
1. USER UPLOADS DOCUMENTS (one-time setup)
   ─────────────────────────────────────────
   Client                tRPC                  Supabase
     │                     │                      │
     ├── getUploadUrl() ──►│                      │
     │◄── signed URL ──────┤                      │
     ├── PUT file ─────────────────────────────────►│ Storage
     ├── confirmUpload() ─►│                      │
     │                     ├── verify file ────────►│ Storage
     │                     ├── extract text ───────►│ pdf-parse
     │                     ├── INSERT document ────►│ PostgreSQL
     │◄── document meta ───┤                      │


2. USER GENERATES A RESPONSE
   ─────────────────────────────────────────
   Client                tRPC                  Supabase         Claude API
     │                     │                      │                 │
     ├── generate.create({
     │     description,
     │     companyName,     ──►│                      │                 │
     │     companyDesc,        │                      │                 │
     │     companyWebsite      │                      │                 │
     │   })                    │                      │                 │
     │                         ├── check rate limit ─►│ gen_logs        │
     │                         │◄── allowed: true ────┤                 │
     │                         ├── INSERT job_offer ─►│ job_offers      │
     │                         ├── SELECT documents ─►│ documents       │
     │                         │◄── extracted texts ──┤                 │
     │                         ├── build context     │                 │
     │                         ├── assemble prompt   │                 │
     │                         ├── messages.create() ──────────────────►│
     │                         │◄── generated text ────────────────────┤
     │                         ├── INSERT response ──►│ responses       │
     │                         ├── increment counter ►│ gen_logs        │
     │◄── response data ───────┤                      │                 │


3. ADMIN VIEWS STATS
   ─────────────────────────────────────────
   Admin RSC              tRPC (admin)          Supabase (service_role)
     │                      │                      │
     ├── prefetch stats ───►│                      │
     │                      ├── SELECT aggregate ──►│ profiles, gen_logs
     │                      │◄── stats data ────────┤
     │◄── render dashboard ─┤                      │
```

---

## Build Order

The components have the following dependency chain. Build in this order to always have a working, testable system.

### Phase 1: Foundation (no features yet, but everything compiles and deploys)

**Build:**
1. Next.js 16 project scaffolding with App Router
2. Supabase project setup (create project, get keys)
3. Database schema (all tables, RLS policies, functions)
4. Supabase Auth configuration (enable magic link provider)
5. Three Supabase clients (browser, server, admin)
6. Middleware (auth token refresh, route protection)
7. tRPC setup (init, context, empty app router, HTTP handler)
8. Auth pages (login, callback, error)

**Why first:** Everything else depends on auth and database. Cannot test any feature without a logged-in user and data persistence.

**Testable outcome:** User can sign in via magic link, land on empty dashboard, sign out.

### Phase 2: Document Management

**Build:**
1. Supabase Storage bucket setup + RLS policies
2. PDF text extraction utility (`pdf-parse` wrapper)
3. `document` tRPC router (upload, confirm, list, delete)
4. Document upload UI (file picker, upload progress, list view)

**Depends on:** Phase 1 (auth, database, tRPC setup)

**Why second:** The generation pipeline needs documents. Without uploaded context, generation produces generic results.

**Testable outcome:** User uploads a PDF, sees it listed, extracted text is stored.

### Phase 3: Core Generation

**Build:**
1. Anthropic Claude client initialization
2. Context builder (`lib/ai/context-builder.ts`)
3. Prompt templates (`lib/ai/prompts.ts`)
4. Rate limiting database function
5. `offer` tRPC router
6. `generate` tRPC router (non-streaming first)
7. `response` tRPC router
8. Generation UI (paste job offer, generate button, display result)
9. Response history page

**Depends on:** Phase 2 (needs documents for context)

**Why third:** This is the core value proposition. It needs auth (Phase 1) and documents (Phase 2) to work properly.

**Testable outcome:** User pastes a job offer, clicks generate, gets a personalized candidature message. Can view history.

### Phase 4: Admin Panel

**Build:**
1. `admin` tRPC router
2. Admin middleware route protection
3. User list page
4. User detail page (with disable/enable/reset actions)
5. Stats dashboard

**Depends on:** Phase 3 (admin needs generation data to display stats)

**Why fourth:** Admin is operational tooling. The core product works without it, but it is needed before going multi-user.

**Testable outcome:** Admin can view all users, disable accounts, reset rate limits, see usage stats.

### Phase 5: Polish and Enhancements

**Build (in any order):**
1. Streaming generation (SSE subscription upgrade)
2. Email notifications (rate limit reached, via Resend)
3. Company website scraping (optional: fetch and include in context)
4. Better error handling and loading states
5. Mobile responsiveness

**Depends on:** Phase 3-4 (core features must work first)

**Why last:** These are improvements to an already-working system. Each can be added independently.

---

## Anti-Patterns to Avoid

### Anti-Pattern: Direct Supabase queries from Client Components

**Why bad:** Bypasses business logic, makes tRPC procedures pointless, splits data access between two layers.
**Instead:** All data access goes through tRPC. Client components only use tRPC hooks. Only exception: Supabase Auth methods (signIn, signOut) which must run on the client.

### Anti-Pattern: Storing extracted text only in memory

**Why bad:** Re-extraction on every generation wastes time and compute.
**Instead:** Store extracted text in `documents.extracted_text` column. Extract once on upload.

### Anti-Pattern: Using Prisma alongside Supabase

**Why bad:** Adds unnecessary ORM layer when supabase-js already provides typed database access. Two migration systems, two connection pools, more complexity.
**Instead:** Use supabase-js directly for all database operations. Generate TypeScript types from the database schema with `supabase gen types`.

### Anti-Pattern: Putting API keys in NEXT_PUBLIC_ environment variables

**Why bad:** Exposes Claude API key and Supabase service_role key to the browser.
**Instead:** `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only env vars. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public.

### Anti-Pattern: Rate limiting in middleware

**Why bad:** Middleware runs on every request. Rate limiting only applies to generation. Adds latency to every page load.
**Instead:** Rate limit inside the `generate.create` tRPC procedure only.

---

## Sources

- [tRPC v11 Server Components setup](https://trpc.io/docs/client/tanstack-react-query/server-components) -- HIGH confidence
- [tRPC v11 announcement](https://trpc.io/blog/announcing-trpc-v11) -- HIGH confidence
- [tRPC subscriptions (SSE)](https://trpc.io/docs/server/subscriptions) -- HIGH confidence
- [tRPC httpBatchStreamLink](https://trpc.io/docs/client/links/httpBatchStreamLink) -- HIGH confidence
- [Supabase Auth with Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) -- HIGH confidence
- [Supabase Storage docs](https://supabase.com/docs/guides/storage) -- HIGH confidence
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [Anthropic streaming API](https://platform.claude.com/docs/en/api/messages-streaming) -- HIGH confidence
- [Supabase admin service_role pattern](https://www.inksh.in/blog/next-tutorial/supabase-admin-server) -- MEDIUM confidence
- [Upstash rate limiting for Vercel](https://upstash.com/blog/edge-rate-limiting) -- HIGH confidence (reviewed but not recommended for this use case)
- [tRPC 11 Next.js App Router setup guide](https://dev.to/matowang/trpc-11-setup-for-nextjs-app-router-2025-33fo) -- MEDIUM confidence
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse) -- HIGH confidence
