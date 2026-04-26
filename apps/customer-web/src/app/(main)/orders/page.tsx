import type { Metadata } from 'next'

import { OrdersPageClient } from './orders-page-client'

export const metadata: Metadata = {
  title: 'My orders',
}

export default function OrdersPage() {
  return <OrdersPageClient />
}
