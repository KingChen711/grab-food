'use client'

import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

import type { RestaurantResult } from '@/lib/api/search.api'

// Custom div icon — avoids the webpack bundler issue with Leaflet's default PNG icons
function createMarkerIcon(isOpen: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${isOpen ? '#f97316' : '#94a3b8'};
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  })
}

interface RestaurantMapProps {
  restaurants: RestaurantResult[]
  userLat?: number
  userLng?: number
}

export function RestaurantMap({ restaurants, userLat, userLng }: RestaurantMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const located = restaurants.filter(
    (r) => r.location?.lat !== undefined && r.location?.lon !== undefined,
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const defaultCenter: [number, number] =
      userLat && userLng
        ? [userLat, userLng]
        : located.length > 0
          ? [located[0]!.location!.lat, located[0]!.location!.lon]
          : [10.7769, 106.7009] // Ho Chi Minh City fallback

    const map = L.map(containerRef.current).setView(defaultCenter, 13)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // User location marker
    if (userLat && userLng) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#3b82f6;border:3px solid white;
          box-shadow:0 0 0 4px rgba(59,130,246,.3);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('<b>You are here</b>')
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync markers when restaurants change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing restaurant markers (keep tile layer + user marker)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const pos = layer.getLatLng()
        // Skip user marker
        if (userLat && userLng && pos.lat === userLat && pos.lng === userLng) return
        map.removeLayer(layer)
      }
    })

    located.forEach((r) => {
      const marker = L.marker([r.location!.lat, r.location!.lon], {
        icon: createMarkerIcon(r.isOpen),
      }).addTo(map)

      marker.bindPopup(`
        <div style="min-width:160px">
          <p style="font-weight:600;margin:0 0 2px">${r.name}</p>
          <p style="font-size:12px;color:#64748b;margin:0 0 4px">${r.city}</p>
          <p style="font-size:12px;margin:0 0 6px">${r.isOpen ? '🟢 Open' : '🔴 Closed'} · ⭐ ${r.avgRating.toFixed(1)}</p>
          <a href="/restaurants/${r.slug}" style="font-size:12px;color:#f97316;text-decoration:none;font-weight:500">
            View menu →
          </a>
        </div>
      `)
    })

    if (located.length > 1) {
      const bounds = L.latLngBounds(located.map((r) => [r.location!.lat, r.location!.lon]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [located, userLat, userLng])

  if (located.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
        No restaurants with location data to display on map.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full overflow-hidden rounded-xl border"
      style={{ zIndex: 0 }}
    />
  )
}
