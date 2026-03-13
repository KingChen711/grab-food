'use client'

import { Button, Input } from '@grab/ui'
import { MapPin, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  function handleUseLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      router.push(`/search?lat=${coords.latitude}&lng=${coords.longitude}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full max-w-2xl">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for food or restaurants..."
            className="h-12 pl-10 text-base"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 px-6">
          Search
        </Button>
      </div>
      <button
        type="button"
        onClick={handleUseLocation}
        className="mt-3 flex items-center gap-1.5 text-sm text-brand hover:underline"
      >
        <MapPin className="h-3.5 w-3.5" />
        Use my location
      </button>
    </form>
  )
}
