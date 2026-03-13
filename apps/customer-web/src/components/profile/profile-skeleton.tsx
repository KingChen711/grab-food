import { Skeleton, SkeletonText } from '@grab/ui'

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <SkeletonText className="h-5 w-40" />
          <SkeletonText className="h-4 w-56" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonText className="h-4 w-20" />
            <SkeletonText className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
