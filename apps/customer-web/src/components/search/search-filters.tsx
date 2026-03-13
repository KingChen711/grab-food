'use client'

import type { ReadonlyURLSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

const CUISINES = [
  'Pizza',
  'Burgers',
  'Sushi',
  'Vietnamese',
  'Chicken',
  'Salads',
  'Desserts',
  'Drinks',
  'Breakfast',
  'Seafood',
  'Vegetarian',
]

const PRICE_OPTIONS = [
  { label: '$', value: '1' },
  { label: '$$', value: '2' },
  { label: '$$$', value: '3' },
  { label: '$$$$', value: '4' },
]

const RATING_OPTIONS = [
  { label: '4.5+', value: '4.5' },
  { label: '4.0+', value: '4.0' },
  { label: '3.5+', value: '3.5' },
]

interface SearchFiltersProps {
  searchParams: ReadonlyURLSearchParams
  onUpdate: (key: string, value: string | null) => void
}

export function SearchFilters({ searchParams, onUpdate }: SearchFiltersProps) {
  const router = useRouter()
  const selectedCuisines = searchParams.getAll('cuisine')
  const selectedPrice = searchParams.get('price')
  const selectedRating = searchParams.get('rating')
  const isOpen = searchParams.get('open') === 'true'

  function toggleCuisine(cuisine: string) {
    const p = new URLSearchParams(searchParams.toString())
    const existing = p.getAll('cuisine')
    p.delete('cuisine')
    if (existing.includes(cuisine)) {
      existing.filter((c) => c !== cuisine).forEach((c) => p.append('cuisine', c))
    } else {
      existing.forEach((c) => p.append('cuisine', c))
      p.append('cuisine', cuisine)
    }
    router.push(`/search?${p.toString()}`)
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Open now */}
      <div>
        <label className="flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => onUpdate('open', e.target.checked ? 'true' : null)}
            className="h-4 w-4 rounded accent-brand"
          />
          Open now
        </label>
      </div>

      {/* Cuisine */}
      <div>
        <p className="mb-2 font-semibold">Cuisine</p>
        <div className="space-y-1.5">
          {CUISINES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCuisines.includes(c.toLowerCase())}
                onChange={() => toggleCuisine(c.toLowerCase())}
                className="h-4 w-4 rounded accent-brand"
              />
              {c}
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="mb-2 font-semibold">Price</p>
        <div className="flex gap-2">
          {PRICE_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onUpdate('price', selectedPrice === value ? null : value)}
              className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                selectedPrice === value
                  ? 'border-brand bg-brand text-brand-foreground'
                  : 'border-input bg-card hover:border-brand'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Min rating */}
      <div>
        <p className="mb-2 font-semibold">Rating</p>
        <div className="space-y-1.5">
          {RATING_OPTIONS.map(({ label, value }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="rating"
                checked={selectedRating === value}
                onChange={() => onUpdate('rating', selectedRating === value ? null : value)}
                className="h-4 w-4 accent-brand"
              />
              ⭐ {label}
            </label>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {(selectedCuisines.length > 0 || selectedPrice || selectedRating || isOpen) && (
        <button
          onClick={() => {
            const p = new URLSearchParams(searchParams.toString())
            p.delete('cuisine')
            p.delete('price')
            p.delete('rating')
            p.delete('open')
            router.push(`/search?${p.toString()}`)
          }}
          className="text-brand hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
