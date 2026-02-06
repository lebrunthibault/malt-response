import { Header } from '@/components/layout/header'
import { getUserData } from '@/lib/auth/get-user-data'

export default async function DocumentsPage() {
  const userData = await getUserData()

  return (
    <>
      <Header title="Mes documents" user={userData} />
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center space-y-4 text-center lg:min-h-0">
        <h1 className="text-3xl font-semibold tracking-tight">Mes documents</h1>
        <p className="text-muted-foreground max-w-md">
          CV, profil et anciennes reponses
        </p>
        <div className="mt-8 text-sm text-muted-foreground">
          Gestion des documents - Phase 3
        </div>
      </div>
    </>
  )
}
