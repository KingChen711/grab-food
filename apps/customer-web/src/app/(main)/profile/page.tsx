'use client'

import dynamic from 'next/dynamic'

const ProfilePageClient = dynamic(() => import('./_client').then((m) => m.ProfilePageClient), {
  ssr: false,
})

export default function ProfilePage() {
  return <ProfilePageClient />
}
