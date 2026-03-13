'use client'

import { useSearchBoxCore, useSearchSession } from '@mapbox/search-js-react'
import { MapPin } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

export interface PlaceResult {
  fullAddress: string
  street?: string
  district?: string
  city: string
  country: string
  lat: number
  lng: number
}

interface LocationSearchInputProps {
  defaultValue?: string
  onSelect: (place: PlaceResult) => void
  error?: boolean
}

export function LocationSearchInput({ defaultValue, onSelect, error }: LocationSearchInputProps) {
  const [value, setValue] = useState(defaultValue ?? '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [proximity, setProximity] = useState<[number, number] | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const skipSuggestRef = useRef(false)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setProximity([coords.longitude, coords.latitude])
    })
  }, [])

  const searchBox = useSearchBoxCore({
    accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
    language: 'en',
    limit: 5,
    proximity,
  })

  const session = useSearchSession(searchBox)

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false
      return
    }

    if (!value.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await session.suggest(value)
        setSuggestions(res.suggestions)
        setOpen(res.suggestions.length > 0)
      } catch {
        // ignore
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [value, session])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = async (suggestion: any) => {
    skipSuggestRef.current = true
    setOpen(false)
    setSuggestions([])
    setValue(suggestion.full_address ?? suggestion.name)

    try {
      const res = await session.retrieve(suggestion)
      const feature = res.features[0]
      if (!feature) return

      const props = feature.properties
      const [lng, lat] = feature.geometry.coordinates

      const result: PlaceResult = {
        fullAddress: props.full_address ?? props.name,
        street: props.address || props.context?.street?.name || undefined,
        district: props.context?.district?.name ?? props.context?.locality?.name ?? undefined,
        city: props.context?.place?.name ?? props.context?.region?.name ?? '',
        country: props.context?.country?.name ?? '',
        lat,
        lng,
      }

      onSelect(result)
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Search for an address..."
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          error ? 'border-destructive' : 'border-input'
        }`}
      />
      {open && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-md">
          {suggestions.map((s) => (
            <li
              key={s.mapbox_id}
              onMouseDown={() => handleSelect(s)}
              className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-accent"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">{s.name}</span>
                {s.place_formatted && (
                  <span className="ml-1 text-muted-foreground">{s.place_formatted}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
