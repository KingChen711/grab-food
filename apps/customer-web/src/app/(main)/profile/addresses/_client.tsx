'use client'

import { Button } from '@grab/ui'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

import { AddressList } from '@/components/addresses/address-list'
import { AddressSkeleton } from '@/components/addresses/address-skeleton'
import { useAddresses } from '@/hooks/use-addresses-query'

export function AddressesPageClient() {
  const { data: addresses, isLoading } = useAddresses()

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to profile
          </Link>
        </Button>
      </div>

      {isLoading ? <AddressSkeleton /> : <AddressList addresses={addresses ?? []} />}
    </div>
  )
}
