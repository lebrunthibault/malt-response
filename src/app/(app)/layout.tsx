import { Sidebar } from '@/components/layout/sidebar'
import { getUserData } from '@/lib/auth/get-user-data'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getUserData()

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar - always visible on lg+ */}
      <div className="hidden lg:block">
        <Sidebar user={userData} />
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
