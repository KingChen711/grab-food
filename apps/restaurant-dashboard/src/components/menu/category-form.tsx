'use client'

import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { ImageUploader } from '@/components/shared/image-uploader'
import { getFieldErrors } from '@/lib/api/api-error'
import { uploadApi } from '@/lib/api/upload.api'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<CategoryFormValues>
  onSubmit: (values: CategoryFormValues) => Promise<void>
  title?: string
}

export function CategoryForm({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  title = 'Add Category',
}: CategoryFormProps) {
  const pendingUploadId = useRef<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { isActive: true, ...initialValues },
  })

  useEffect(() => {
    if (open) {
      pendingUploadId.current = null
      reset({ isActive: true, ...initialValues })
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = async (values: CategoryFormValues) => {
    try {
      await onSubmit(values)
      // Claim the upload now that the URL is durably saved
      if (pendingUploadId.current) {
        void uploadApi.claim(pendingUploadId.current)
        pendingUploadId.current = null
      }
      onOpenChange(false)
    } catch (err) {
      const knownFields = new Set(Object.keys(categorySchema.shape))
      for (const [field, msg] of Object.entries(getFieldErrors(err))) {
        if (knownFields.has(field)) setError(field as keyof CategoryFormValues, { message: msg })
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-0 z-50 m-auto h-fit w-full max-w-md rounded-lg border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="e.g. Starters, Mains, Desserts"
                error={!!errors.name}
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Optional description" {...register('description')} />
            </div>

            <Controller
              control={control}
              name="imageUrl"
              render={({ field }) => (
                <ImageUploader
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onPendingUploadId={(id) => {
                    pendingUploadId.current = id
                  }}
                  context="menu_item"
                  label="Category Image"
                  hint="Recommended: 16:9"
                />
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  error={!!errors.sortOrder}
                  {...register('sortOrder')}
                />
                {errors.sortOrder && (
                  <p className="text-xs text-destructive">{errors.sortOrder.message}</p>
                )}
              </div>

              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    {...register('isActive')}
                  />
                  Active (visible to customers)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={isSubmitting}>
                Save
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
