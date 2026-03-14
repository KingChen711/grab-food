'use client'

import type { DayOfWeek, OperatingHours, Restaurant } from '@grab/types'
import { Button } from '@grab/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { restaurantQueryKeys } from '@/hooks/use-restaurant'
import { restaurantApi } from '@/lib/api/restaurant.api'

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
  { key: 'SAT', label: 'Saturday' },
  { key: 'SUN', label: 'Sunday' },
]

function getInitialHours(existingHours: OperatingHours[]): Record<DayOfWeek, OperatingHours> {
  const defaults: Record<DayOfWeek, OperatingHours> = {} as Record<DayOfWeek, OperatingHours>
  for (const day of DAYS) {
    const existing = existingHours.find((h) => h.dayOfWeek === day.key)
    defaults[day.key] = existing ?? {
      dayOfWeek: day.key,
      openTime: '09:00',
      closeTime: '21:00',
      isClosed: false,
    }
  }
  return defaults
}

interface HoursEditorProps {
  restaurant: Restaurant
}

export function HoursEditor({ restaurant }: HoursEditorProps) {
  const queryClient = useQueryClient()
  const [hours, setHours] = useState(() => getInitialHours(restaurant.operatingHours))

  const saveMutation = useMutation({
    mutationFn: () => restaurantApi.updateAllHours(restaurant.id, Object.values(hours)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.myRestaurants })
      toast.success('Operating hours saved')
    },
    onError: () => toast.error('Failed to save hours'),
  })

  const updateDay = (day: DayOfWeek, field: keyof OperatingHours, value: string | boolean) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Day</th>
              <th className="px-4 py-3 text-left font-medium">Open Time</th>
              <th className="px-4 py-3 text-left font-medium">Close Time</th>
              <th className="px-4 py-3 text-center font-medium">Closed</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {DAYS.map(({ key, label }) => {
              const dayHours = hours[key]
              return (
                <tr key={key} className={dayHours.isClosed ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium">{label}</td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
                      value={dayHours.openTime}
                      disabled={dayHours.isClosed}
                      onChange={(e) => updateDay(key, 'openTime', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
                      value={dayHours.closeTime}
                      disabled={dayHours.isClosed}
                      onChange={(e) => updateDay(key, 'closeTime', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={dayHours.isClosed}
                      onChange={(e) => updateDay(key, 'isClosed', e.target.checked)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          Save Hours
        </Button>
      </div>
    </div>
  )
}
