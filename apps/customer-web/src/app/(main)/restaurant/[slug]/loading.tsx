export default function RestaurantLoading() {
  return (
    <div>
      <div className="h-48 w-full animate-pulse bg-muted sm:h-64 md:h-80" />
      <div className="container mt-6 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
        <div className="mt-8 h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}
