import { ProfileSkeleton } from '@/components/profile/profile-skeleton'

export default function ProfileLoading() {
  return (
    <div className="container max-w-2xl py-8">
      <ProfileSkeleton />
    </div>
  )
}
