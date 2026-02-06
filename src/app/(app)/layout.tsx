import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      {/* Desktop sidebar - always visible on lg+ */}
      <div className="hidden lg:block">
        <Sidebar />
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
