'use client'

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Distance', value: 'distance' },
  { label: 'Rating', value: 'rating' },
  { label: 'Popularity', value: 'popularity' },
]

interface SortSelectProps {
  value: string
  onChange: (value: string) => void
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {SORT_OPTIONS.map(({ label, value: v }) => (
        <option key={v} value={v}>
          Sort: {label}
        </option>
      ))}
    </select>
  )
}
