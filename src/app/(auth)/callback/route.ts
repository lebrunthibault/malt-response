import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  // Validate redirect URL to prevent open redirect
  let redirectPath = '/generate'
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    redirectPath = redirect
  }

  // Successful authentication - redirect to validated path
  return NextResponse.redirect(new URL(redirectPath, request.url))
}
