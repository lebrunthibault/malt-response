'use client'

import { useActionState, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { requestOtpAction, verifyOtpAction } from './actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [showOtpForm, setShowOtpForm] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ''

  const [emailState, emailAction, emailPending] = useActionState(
    async (_prevState: any, formData: FormData) => {
      const result = await requestOtpAction(formData)
      if (result.success) {
        const emailValue = formData.get('email') as string
        setEmail(emailValue)
        setShowOtpForm(true)
      }
      return result
    },
    null
  )

  const [otpState, otpAction, otpPending] = useActionState(
    async (_prevState: any, formData: FormData) => {
      return await verifyOtpAction(formData)
    },
    null
  )

  const handleBackToEmail = () => {
    setShowOtpForm(false)
    setEmail('')
  }

  const handleResendCode = async () => {
    const formData = new FormData()
    formData.append('email', email)
    await requestOtpAction(formData)
  }

  if (showOtpForm) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Verification</h1>
            <p className="text-sm text-muted-foreground">
              Entrez le code envoye a {email}
            </p>
          </div>

          <form action={otpAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <div className="space-y-2">
              <Label htmlFor="token">Code</Label>
              <Input
                id="token"
                name="token"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                required
                placeholder="000000"
                className="text-center text-lg tracking-widest"
              />
            </div>

            {otpState && !otpState.success && (
              <p className="text-sm text-destructive">{otpState.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={otpPending}>
              {otpPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
              >
                Renvoyer le code
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToEmail}
              >
                Utiliser une autre adresse
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          <p className="text-sm text-muted-foreground">
            Connectez-vous avec votre email
          </p>
        </div>

        <form action={emailAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="votre@email.com"
            />
          </div>

          {emailState && !emailState.success && (
            <p className="text-sm text-destructive">{emailState.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={emailPending}>
            {emailPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer le code
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
