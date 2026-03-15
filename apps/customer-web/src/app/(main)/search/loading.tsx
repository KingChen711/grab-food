export default function SearchLoading() {
  return (
    <div className="container py-6">
      <div className="mb-6 flex gap-2">
        <div className="h-10 flex-1 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}
