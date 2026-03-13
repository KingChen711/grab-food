import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Addresses',
  description: 'Manage your delivery addresses.',
}

export default function AddressesLayout({ children }: { children: React.ReactNode }) {
  return children
}
