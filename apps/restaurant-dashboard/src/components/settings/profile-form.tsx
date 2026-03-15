'use client'

import type { Restaurant } from '@grab/types'
import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { ImageUploader } from '@/components/shared/image-uploader'
import { restaurantQueryKeys } from '@/hooks/use-restaurant'
import { getFieldErrors } from '@/lib/api/api-error'
import { restaurantApi } from '@/lib/api/restaurant.api'
import { uploadApi } from '@/lib/api/upload.api'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  phone: z.string().optional(),
  cuisineTypes: z.string().optional(), // comma-separated
  priceRange: z.coerce.number().int().min(1).max(4),
  minOrderAmount: z.coerce.number().min(0),
  deliveryFee: z.coerce.number().min(0),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileFormProps {
  restaurant: Restaurant
}

export function ProfileForm({ restaurant }: ProfileFormProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: restaurant.name,
      description: restaurant.description ?? '',
      phone: restaurant.phone,
      cuisineTypes: restaurant.cuisineTypes.join(', '),
      priceRange: restaurant.priceRange,
      minOrderAmount: restaurant.minOrderAmount,
      deliveryFee: restaurant.deliveryFee,
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      restaurantApi.update(restaurant.id, {
        name: values.name,
        description: values.description,
        phone: values.phone,
        cuisineTypes: values.cuisineTypes
          ? values.cuisineTypes
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        priceRange: values.priceRange,
        minOrderAmount: values.minOrderAmount,
        deliveryFee: values.deliveryFee,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.myRestaurants })
      toast.success('Restaurant profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const pendingCoverUploadId = useRef<string | null>(null)
  const pendingLogoUploadId = useRef<string | null>(null)

  const coverMutation = useMutation({
    mutationFn: (url: string) => restaurantApi.updateCoverImage(restaurant.id, url),
    onSuccess: () => {
      if (pendingCoverUploadId.current) {
        void uploadApi.claim(pendingCoverUploadId.current)
        pendingCoverUploadId.current = null
      }
      void queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.myRestaurants })
      toast.success('Cover image updated')
    },
    onError: () => toast.error('Failed to update cover image'),
  })

  const logoMutation = useMutation({
    mutationFn: (url: string) => restaurantApi.updateLogo(restaurant.id, url),
    onSuccess: () => {
      if (pendingLogoUploadId.current) {
        void uploadApi.claim(pendingLogoUploadId.current)
        pendingLogoUploadId.current = null
      }
      void queryClient.invalidateQueries({ queryKey: restaurantQueryKeys.myRestaurants })
      toast.success('Logo updated')
    },
    onError: () => toast.error('Failed to update logo'),
  })

  const handleFormSubmit = async (v: ProfileFormValues) => {
    try {
      await updateMutation.mutateAsync(v)
    } catch (err) {
      const knownFields = new Set(Object.keys(profileSchema.shape))
      for (const [field, msg] of Object.entries(getFieldErrors(err))) {
        if (knownFields.has(field)) setError(field as keyof ProfileFormValues, { message: msg })
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Images */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Images
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <ImageUploader
            value={restaurant.coverImageUrl ?? ''}
            onChange={(url) => {
              if (url) void coverMutation.mutateAsync(url)
            }}
            onPendingUploadId={(id) => {
              pendingCoverUploadId.current = id
            }}
            context="restaurant_cover"
            entityId={restaurant.id}
            label="Cover Image"
            hint="Recommended: 16:9 (1280×720)"
          />
          <ImageUploader
            value={restaurant.logoUrl ?? ''}
            onChange={(url) => {
              if (url) void logoMutation.mutateAsync(url)
            }}
            onPendingUploadId={(id) => {
              pendingLogoUploadId.current = id
            }}
            context="restaurant_logo"
            entityId={restaurant.id}
            label="Logo"
            hint="Recommended: 1:1 (512×512)"
          />
        </div>
      </div>

      {/* Profile details */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Restaurant Name *</label>
          <Input error={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input placeholder="Tell customers about your restaurant" {...register('description')} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <Input type="tel" placeholder="+1 555 000 0000" {...register('phone')} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Cuisine Types</label>
          <Input
            placeholder="e.g. Italian, Pizza, Pasta (comma-separated)"
            {...register('cuisineTypes')}
          />
          <p className="text-xs text-muted-foreground">Separate multiple types with commas</p>
        </div>

        {/* Address (read-only display) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {restaurant.address?.fullAddress ?? 'No address on file'}
            {restaurant.address?.city && `, ${restaurant.address.city}`}
            {restaurant.address?.country && `, ${restaurant.address.country}`}
          </div>
          <p className="text-xs text-muted-foreground">Address is managed by administrators.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Price Range</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('priceRange')}
            >
              <option value={1}>$ (Budget)</option>
              <option value={2}>$$ (Moderate)</option>
              <option value={3}>$$$ (Expensive)</option>
              <option value={4}>$$$$ (Very Expensive)</option>
            </select>
            {errors.priceRange && (
              <p className="text-xs text-destructive">{errors.priceRange.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Min Order</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              error={!!errors.minOrderAmount}
              {...register('minOrderAmount')}
            />
            {errors.minOrderAmount && (
              <p className="text-xs text-destructive">{errors.minOrderAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Fee</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              error={!!errors.deliveryFee}
              {...register('deliveryFee')}
            />
            {errors.deliveryFee && (
              <p className="text-xs text-destructive">{errors.deliveryFee.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isSubmitting || updateMutation.isPending}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
