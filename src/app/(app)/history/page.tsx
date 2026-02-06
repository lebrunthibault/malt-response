import { Header } from '@/components/layout/header'

export default function HistoryPage() {
  return (
    <>
      <Header title="Historique" />
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center space-y-4 text-center lg:min-h-0">
        <h1 className="text-3xl font-semibold tracking-tight">Historique</h1>
        <p className="text-muted-foreground max-w-md">
          Vos reponses generees
        </p>
        <div className="mt-8 text-sm text-muted-foreground">
          Historique des generations - Phase 5
        </div>
      </div>
    </>
  )
}
