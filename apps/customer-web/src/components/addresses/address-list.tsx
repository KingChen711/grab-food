'use client'

import type { UserAddress } from '@grab/types'
import { Button, EmptyState } from '@grab/ui'
import { MapPin, Plus } from 'lucide-react'
import { useState } from 'react'

import { AddressCard } from './address-card'
import { AddressForm } from './address-form'

interface AddressListProps {
  addresses: UserAddress[]
}

export function AddressList({ addresses }: AddressListProps) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved Addresses</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-8 w-8" />}
          title="No addresses yet"
          description="Add a delivery address to speed up checkout."
          action={{ label: 'Add your first address', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}

      <AddressForm open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
