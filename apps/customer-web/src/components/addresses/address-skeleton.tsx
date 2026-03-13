import { Skeleton, SkeletonText } from '@grab/ui'

export function AddressSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <SkeletonText className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}
