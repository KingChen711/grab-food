'use client'

import type { UserAddress } from '@grab/types'
import { Badge } from '@grab/ui'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MapPin, MoreVertical, Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useDeleteAddress, useSetDefaultAddress } from '@/hooks/use-addresses-query'

import { AddressForm } from './address-form'

interface AddressCardProps {
  address: UserAddress
}

export function AddressCard({ address }: AddressCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const deleteAddress = useDeleteAddress()
  const setDefault = useSetDefaultAddress()

  return (
    <>
      <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
            <div>
              {address.label && <p className="text-sm font-semibold capitalize">{address.label}</p>}
              <p className="text-sm">{address.fullAddress}</p>
              <p className="text-xs text-muted-foreground">
                {[address.district, address.city, address.country].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {address.isDefault && (
              <Badge variant="brand" className="text-xs">
                Default
              </Badge>
            )}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  aria-label="More options"
                  className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent focus:outline-none"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="z-50 min-w-[140px] animate-fade-in rounded-lg border bg-popover p-1 shadow-md"
                >
                  <DropdownMenu.Item asChild>
                    <button
                      onClick={() => setEditOpen(true)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent focus:outline-none"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </DropdownMenu.Item>
                  {!address.isDefault && (
                    <DropdownMenu.Item asChild>
                      <button
                        onClick={() => setDefault.mutate(address.id)}
                        disabled={setDefault.isPending}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent focus:outline-none disabled:opacity-50"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Set as default
                      </button>
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item asChild>
                    <button
                      onClick={() => deleteAddress.mutate(address.id)}
                      disabled={deleteAddress.isPending}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus:outline-none disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      <AddressForm open={editOpen} onClose={() => setEditOpen(false)} address={address} />
    </>
  )
}
