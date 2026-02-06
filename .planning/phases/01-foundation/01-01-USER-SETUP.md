# User Setup Required: Phase 01 Plan 01

This plan requires you to configure external services before the application can run.

## Services to Configure

### 1. Supabase

**Why needed:** Database, auth, and storage backend

**Steps:**

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization, enter project name, database password
4. Wait for project to provision (~2 minutes)
5. Once ready, navigate to Project Settings → API
6. Copy the following values:

**Environment variables to set:**

```bash
# In .env.local file (already created with placeholders)

# Project URL (from "Project Settings → API → Project URL")
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Publishable key (from "Project Settings → API → anon/public key")
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Service role key (from "Project Settings → API → service_role key")
# ⚠️ NEVER commit this to git - keep in .env.local only
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**After setting variables:**

```bash
# Restart the Next.js dev server
npm run dev
```

## Verification

After configuring Supabase credentials:

1. Run `npm run dev`
2. Server should start without errors on localhost:3000
3. No Supabase connection errors in terminal

**Note:** The application won't connect to Supabase until credentials are configured, but the dev server will still run with placeholder values.

## Security Notes

- ✅ `.env.local` is already in `.gitignore` (secure by default)
- ⚠️ NEVER prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` (it would expose to browser)
- ℹ️ Only `NEXT_PUBLIC_*` variables are safe to expose to browser
- 🔒 Service role key grants admin access to your database - keep it secret

## Next Steps

Once Supabase is configured:
- Phase 01-02 will set up tRPC with Supabase auth context
- Phase 01-03 will create database schema (profiles, documents, responses)
- Phase 02 will implement authentication flows

## Troubleshooting

**"Invalid JWT" errors:**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` matches your project URL exactly
- Ensure `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the anon/public key (not service_role)

**Build fails with environment variable errors:**
- Restart dev server after changing .env.local
- Ensure no trailing spaces in .env.local values

**TypeScript errors about process.env:**
- This is normal with placeholder values
- Will resolve once real Supabase credentials are configured
