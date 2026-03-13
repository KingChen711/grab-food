'use client'

import dynamic from 'next/dynamic'

const AddressesPageClient = dynamic(() => import('./_client').then((m) => m.AddressesPageClient), {
  ssr: false,
})

export default function AddressesPage() {
  return <AddressesPageClient />
}
