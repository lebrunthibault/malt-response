import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-destructive">
            Erreur d&apos;authentification
          </h1>
          <p className="text-sm text-muted-foreground">
            Une erreur est survenue lors de votre connexion.
            Veuillez reessayer.
          </p>
        </div>

        <Button asChild>
          <Link href="/login">
            Retour a la connexion
          </Link>
        </Button>
      </div>
    </div>
  )
}
