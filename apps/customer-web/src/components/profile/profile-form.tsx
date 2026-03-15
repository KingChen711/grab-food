'use client'

import type { User } from '@grab/types'
import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ImageUploader } from '@/components/shared/image-uploader'
import { queryKeys } from '@/hooks/use-auth-query'
import { uploadApi } from '@/lib/api/upload.api'
import { usersApi } from '@/lib/api/users.api'
import { type UpdateProfileInput, updateProfileSchema } from '@/lib/validators/profile.schemas'
import { useAuthStore } from '@/stores/auth.store'

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [editing, setEditing] = useState(false)
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const pendingUploadId = useRef<string | null>(null)

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user.profile?.fullName ?? '',
      dateOfBirth: user.profile?.dateOfBirth ?? '',
      bio: user.profile?.bio ?? '',
      avatarUrl: user.profile?.avatarUrl ?? '',
    },
  })

  const updateProfile = useMutation({
    mutationFn: (data: UpdateProfileInput) => usersApi.updateProfile(data),
    onSuccess: async () => {
      if (pendingUploadId.current) {
        void uploadApi.claim(pendingUploadId.current)
        pendingUploadId.current = null
      }
      const updated = await usersApi.getMe()
      queryClient.setQueryData(queryKeys.me, updated)
      setUser(updated)
      toast.success('Profile updated')
      setEditing(false)
    },
    onError: () => toast.error('Failed to update profile'),
  })

  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user.profile?.avatarUrl ? (
              <img
                src={user.profile.avatarUrl}
                alt={user.profile.fullName ?? 'Avatar'}
                className="h-16 w-16 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {(user.profile?.fullName ?? user.email ?? user.phone ?? '?')[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {user.profile?.fullName ?? user.email ?? user.phone ?? '—'}
              </h2>
              <p className="text-sm text-muted-foreground">{user.email ?? user.phone}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        {user.profile?.bio && <p className="text-sm text-muted-foreground">{user.profile.bio}</p>}

        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium text-muted-foreground">Email</p>
            <p>{user.email ?? '—'}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Phone</p>
            <p>{user.phone ?? '—'}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Date of birth</p>
            <p>{user.profile?.dateOfBirth ?? '—'}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Role</p>
            <p className="capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit((data) => updateProfile.mutate(data))} className="space-y-4">
      {/* Avatar upload */}
      <Controller
        control={form.control}
        name="avatarUrl"
        render={({ field }) => (
          <ImageUploader
            value={field.value ?? ''}
            onChange={field.onChange}
            onPendingUploadId={(id) => {
              pendingUploadId.current = id
            }}
            context="avatar"
            entityId={user.id}
            label="Profile Photo"
            hint="Square image recommended"
            round
          />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Full name</label>
          <Input error={!!form.formState.errors.fullName} {...form.register('fullName')} />
          {form.formState.errors.fullName && (
            <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Date of birth</label>
          <Input
            type="date"
            error={!!form.formState.errors.dateOfBirth}
            {...form.register('dateOfBirth')}
          />
          {form.formState.errors.dateOfBirth && (
            <p className="text-xs text-destructive">{form.formState.errors.dateOfBirth.message}</p>
          )}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Bio</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Tell us about yourself"
            {...form.register('bio')}
          />
          {form.formState.errors.bio && (
            <p className="text-xs text-destructive">{form.formState.errors.bio.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={updateProfile.isPending}>
          Save changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset()
            setEditing(false)
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
