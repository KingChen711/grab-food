import type { Metadata } from 'next'

import { OrderDetailClient } from './order-detail-client'

export const metadata: Metadata = {
  title: 'Order detail',
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  return <OrderDetailClient id={id} />
}
