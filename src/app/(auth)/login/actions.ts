'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email('Email invalide'),
})

const otpSchema = z.object({
  email: z.string().email('Email invalide'),
  token: z.string().length(6, 'Le code doit contenir 6 chiffres'),
  redirectTo: z.string().optional(),
})

export async function requestOtpAction(formData: FormData) {
  const email = formData.get('email') as string

  // Validate email
  const result = emailSchema.safeParse({ email })
  if (!result.success) {
    return {
      success: false,
      error: 'Email invalide',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: result.data.email,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.error('OTP request error:', error)
    return {
      success: false,
      error: 'Erreur lors de l\'envoi du code',
    }
  }

  return { success: true }
}

export async function verifyOtpAction(formData: FormData) {
  const email = formData.get('email') as string
  const token = formData.get('token') as string
  const redirectTo = formData.get('redirectTo') as string | null

  // Validate inputs
  const result = otpSchema.safeParse({ email, token, redirectTo: redirectTo || undefined })
  if (!result.success) {
    return {
      success: false,
      error: 'Donnees invalides',
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email: result.data.email,
    token: result.data.token,
    type: 'email',
  })

  if (error) {
    console.error('OTP verification error:', error)

    // Handle specific error messages
    if (error.message.includes('expired') || error.code === 'otp_expired') {
      return {
        success: false,
        error: 'Code expire — demandez un nouveau code',
      }
    }

    return {
      success: false,
      error: 'Code incorrect — verifiez votre email et reessayez',
    }
  }

  // Validate redirectTo to prevent open redirect
  let validRedirectTo = '/generate'
  if (result.data.redirectTo) {
    if (result.data.redirectTo.startsWith('/') && !result.data.redirectTo.startsWith('//')) {
      validRedirectTo = result.data.redirectTo
    }
  }

  redirect(validRedirectTo)
}
