'use client'

import type { UserAddress } from '@grab/types'
import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'

import { useCreateAddress, useUpdateAddress } from '@/hooks/use-addresses-query'
import { type CreateAddressInput, createAddressSchema } from '@/lib/validators/profile.schemas'

import { LocationSearchInput, type PlaceResult } from './location-search-input'

interface AddressFormProps {
  open: boolean
  onClose: () => void
  address?: UserAddress
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function AddressForm({ open, onClose, address }: AddressFormProps) {
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const isEditing = !!address

  const form = useForm<CreateAddressInput>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: {
      label: address?.label ?? '',
      fullAddress: address?.fullAddress ?? '',
      street: address?.street ?? '',
      district: address?.district ?? '',
      city: address?.city ?? '',
      country: address?.country ?? 'Vietnam',
      lat: address?.lat,
      lng: address?.lng,
      isDefault: address?.isDefault ?? false,
    },
  })

  const handlePlaceSelect = useCallback(
    (place: PlaceResult) => {
      form.setValue('fullAddress', place.fullAddress, { shouldValidate: true })
      form.setValue('street', place.street ?? '')
      form.setValue('district', place.district ?? '')
      form.setValue('city', place.city, { shouldValidate: true })
      form.setValue('country', place.country)
      form.setValue('lat', place.lat)
      form.setValue('lng', place.lng)
    },
    [form],
  )

  const onSubmit = (data: CreateAddressInput) => {
    if (isEditing && address) {
      updateAddress.mutate({ id: address.id, data }, { onSuccess: onClose })
    } else {
      createAddress.mutate(data, { onSuccess: onClose })
    }
  }

  const isPending = createAddress.isPending || updateAddress.isPending

  return (
    <Dialog.Root open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-0 z-50 m-auto h-fit w-full max-w-md rounded-xl bg-background p-6 shadow-floating duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {isEditing ? 'Edit address' : 'Add new address'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Search address *</label>
              <LocationSearchInput
                defaultValue={address?.fullAddress}
                onSelect={handlePlaceSelect}
                error={!!form.formState.errors.fullAddress || !!form.formState.errors.lat}
              />
              <FieldError message={form.formState.errors.fullAddress?.message} />
              {form.formState.errors.lat && (
                <FieldError message="Please select an address from the suggestions" />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Label (optional)</label>
                <Input
                  placeholder="e.g. Home, Work"
                  error={!!form.formState.errors.label}
                  {...form.register('label')}
                />
                <FieldError message={form.formState.errors.label?.message} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <Input error={!!form.formState.errors.city} {...form.register('city')} />
                <FieldError message={form.formState.errors.city?.message} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                className="accent-brand"
                {...form.register('isDefault')}
              />
              <label htmlFor="isDefault" className="text-sm">
                Set as default address
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={isPending} className="flex-1">
                {isEditing ? 'Save changes' : 'Add address'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
