export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="h-10 w-48 rounded-lg bg-muted" />

      {/* Content blocks */}
      <div className="space-y-4">
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-40 rounded-lg bg-muted" />
        <div className="h-28 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
