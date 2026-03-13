'use client'

import { useRouter } from 'next/navigation'

const CUISINES = [
  { label: 'All', value: '', emoji: '🍽️' },
  { label: 'Pizza', value: 'pizza', emoji: '🍕' },
  { label: 'Burgers', value: 'burgers', emoji: '🍔' },
  { label: 'Sushi', value: 'sushi', emoji: '🍱' },
  { label: 'Vietnamese', value: 'vietnamese', emoji: '🍜' },
  { label: 'Chicken', value: 'chicken', emoji: '🍗' },
  { label: 'Salads', value: 'salads', emoji: '🥗' },
  { label: 'Desserts', value: 'desserts', emoji: '🍰' },
  { label: 'Drinks', value: 'drinks', emoji: '🧋' },
  { label: 'Breakfast', value: 'breakfast', emoji: '🍳' },
  { label: 'Seafood', value: 'seafood', emoji: '🦞' },
  { label: 'Vegetarian', value: 'vegetarian', emoji: '🥦' },
]

export function CuisineCategories() {
  const router = useRouter()

  function handleSelect(value: string) {
    router.push(value ? `/search?cuisine=${encodeURIComponent(value)}` : '/search')
  }

  return (
    <section className="container py-8">
      <h2 className="mb-4 text-lg font-semibold">What are you craving?</h2>
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
        {CUISINES.map(({ label, value, emoji }) => (
          <button
            key={label}
            onClick={() => handleSelect(value)}
            className="flex flex-shrink-0 flex-col items-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-medium transition-colors hover:border-brand hover:bg-brand-50 hover:text-brand dark:hover:bg-brand-900/20"
          >
            <span className="text-2xl">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
