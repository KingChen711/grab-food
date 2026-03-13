'use client'

import { Rating, Skeleton } from '@grab/ui'
import Image from 'next/image'
import { useState } from 'react'

import { useRestaurantReviews } from '@/hooks/use-restaurant-query'

interface ReviewsSectionProps {
  restaurantId: string
}

export function ReviewsSection({ restaurantId }: ReviewsSectionProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useRestaurantReviews(restaurantId, page)

  const totalPages = data ? Math.ceil(data.total / 10) : 0

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">
        Reviews
        {data && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">({data.total})</span>
        )}
      </h2>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-4">
          {data.items.map((review) => (
            <div key={review.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{review.userId.slice(0, 8)}...</span>
                    <Rating value={review.rating} size="sm" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {review.comment && <p className="mt-2 text-sm">{review.comment}</p>}

              {review.images && review.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {review.images.slice(0, 3).map((img, i) => (
                    <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                      <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                    </div>
                  ))}
                </div>
              )}

              {review.ownerReply && (
                <div className="mt-3 rounded-lg bg-muted p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Owner reply</p>
                  <p className="mt-1 text-sm">{review.ownerReply}</p>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
