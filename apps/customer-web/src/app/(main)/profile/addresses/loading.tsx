import { AddressSkeleton } from '@/components/addresses/address-skeleton'

export default function AddressesLoading() {
  return (
    <div className="container max-w-3xl py-8">
      <AddressSkeleton />
    </div>
  )
}
