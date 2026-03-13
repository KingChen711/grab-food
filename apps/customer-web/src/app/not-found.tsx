import type { Metadata } from 'next'

import { NotFoundContent } from './_not-found-content'

export const metadata: Metadata = {
  title: 'Page Not Found',
}

export default function NotFound() {
  return <NotFoundContent />
}
