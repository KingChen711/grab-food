'use client'

import type { UserAddress } from '@grab/types'
import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { useCreateAddress, useUpdateAddress } from '@/hooks/use-addresses-query'
import { type CreateAddressInput, createAddressSchema } from '@/lib/validators/profile.schemas'

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
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-fade-in rounded-xl bg-background p-6 shadow-floating">
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
                <label className="text-sm font-medium">Country</label>
                <Input error={!!form.formState.errors.country} {...form.register('country')} />
                <FieldError message={form.formState.errors.country?.message} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Full address *</label>
              <Input
                placeholder="Full street address"
                error={!!form.formState.errors.fullAddress}
                {...form.register('fullAddress')}
              />
              <FieldError message={form.formState.errors.fullAddress?.message} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">District</label>
                <Input placeholder="District" {...form.register('district')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City *</label>
                <Input
                  placeholder="City"
                  error={!!form.formState.errors.city}
                  {...form.register('city')}
                />
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
