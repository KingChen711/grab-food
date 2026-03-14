'use client'

import type { Restaurant } from '@grab/types'
import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { restaurantQueryKeys } from '@/hooks/use-restaurant'
import { restaurantApi } from '@/lib/api/restaurant.api'

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

  return (
    <form onSubmit={handleSubmit((v) => updateMutation.mutateAsync(v))} className="space-y-5">
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
          <label className="text-sm font-medium">Min Order ($)</label>
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
          <label className="text-sm font-medium">Delivery Fee ($)</label>
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
  )
}
