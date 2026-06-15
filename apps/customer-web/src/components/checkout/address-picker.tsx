'use client'

import type { UserAddress } from '@grab/types'
import { Button } from '@grab/ui'
import { Check, MapPin, Plus } from 'lucide-react'
import Link from 'next/link'

interface AddressPickerProps {
  addresses: UserAddress[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function AddressPicker({ addresses, selectedId, onSelect }: AddressPickerProps) {
  if (addresses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">No saved addresses</p>
        <p className="mt-1 text-xs text-muted-foreground">Add an address to continue</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/profile/addresses">
            <Plus className="mr-1 h-4 w-4" />
            Add address
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {addresses.map((addr) => (
        <button
          key={addr.id}
          onClick={() => onSelect(addr.id)}
          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-brand ${
            selectedId === addr.id ? 'border-brand bg-brand/5' : ''
          }`}
        >
          <div className="mt-0.5">
            {selectedId === addr.id ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Check className="h-3 w-3" />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full border" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{addr.label ?? 'Address'}</span>
              {addr.isDefault && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">Default</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{addr.fullAddress}</p>
          </div>
        </button>
      ))}

      <Button asChild variant="ghost" size="sm" className="w-full">
        <Link href="/profile/addresses">
          <Plus className="mr-1 h-4 w-4" />
          Manage addresses
        </Link>
      </Button>
    </div>
  )
}
