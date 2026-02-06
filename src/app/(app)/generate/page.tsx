import { Header } from '@/components/layout/header'
import { getUserData } from '@/lib/auth/get-user-data'

export default async function GeneratePage() {
  const userData = await getUserData()

  return (
    <>
      <Header title="Generer une reponse" user={userData} />
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center space-y-4 text-center lg:min-h-0">
        <h1 className="text-3xl font-semibold tracking-tight">Generer une reponse</h1>
        <p className="text-muted-foreground max-w-md">
          Collez une offre Malt et generez une reponse personnalisee
        </p>
        <div className="mt-8 text-sm text-muted-foreground">
          Formulaire de generation - Phase 4
        </div>
      </div>
    </>
  )
}
