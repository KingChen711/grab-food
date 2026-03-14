'use client'

import type { MenuItem } from '@grab/types'
import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(0, 'Price must be >= 0'),
  prepTimeMinutes: z.coerce.number().int().min(0).optional(),
  calories: z.coerce.number().int().min(0).optional(),
  isAvailable: z.boolean().default(true),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isHalal: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
})

export type MenuItemFormValues = z.infer<typeof menuItemSchema>

interface MenuItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<MenuItem>
  onSubmit: (values: MenuItemFormValues) => Promise<void>
  title?: string
}

const booleanFields: Array<{ name: keyof MenuItemFormValues; label: string }> = [
  { name: 'isAvailable', label: 'Available' },
  { name: 'isVegetarian', label: 'Vegetarian' },
  { name: 'isVegan', label: 'Vegan' },
  { name: 'isGlutenFree', label: 'Gluten Free' },
  { name: 'isHalal', label: 'Halal' },
  { name: 'isSpicy', label: 'Spicy' },
]

export function MenuItemForm({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  title = 'Add Item',
}: MenuItemFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      basePrice: initialValues?.basePrice ?? 0,
      prepTimeMinutes: initialValues?.prepTimeMinutes ?? undefined,
      calories: initialValues?.calories ?? undefined,
      isAvailable: initialValues?.isAvailable ?? true,
      isVegetarian: initialValues?.dietaryInfo?.isVegetarian ?? false,
      isVegan: initialValues?.dietaryInfo?.isVegan ?? false,
      isGlutenFree: initialValues?.dietaryInfo?.isGlutenFree ?? false,
      isHalal: initialValues?.dietaryInfo?.isHalal ?? false,
      isSpicy: initialValues?.dietaryInfo?.isSpicy ?? false,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: initialValues?.name ?? '',
        description: initialValues?.description ?? '',
        basePrice: initialValues?.basePrice ?? 0,
        prepTimeMinutes: initialValues?.prepTimeMinutes ?? undefined,
        calories: initialValues?.calories ?? undefined,
        isAvailable: initialValues?.isAvailable ?? true,
        isVegetarian: initialValues?.dietaryInfo?.isVegetarian ?? false,
        isVegan: initialValues?.dietaryInfo?.isVegan ?? false,
        isGlutenFree: initialValues?.dietaryInfo?.isGlutenFree ?? false,
        isHalal: initialValues?.dietaryInfo?.isHalal ?? false,
        isSpicy: initialValues?.dietaryInfo?.isSpicy ?? false,
      })
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = async (values: MenuItemFormValues) => {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
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
              <Input placeholder="Item name" error={!!errors.name} {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Optional description" {...register('description')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Base Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  error={!!errors.basePrice}
                  {...register('basePrice')}
                />
                {errors.basePrice && (
                  <p className="text-xs text-destructive">{errors.basePrice.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prep Time (min)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 15"
                  {...register('prepTimeMinutes')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Calories</label>
              <Input type="number" min="0" placeholder="Optional" {...register('calories')} />
            </div>

            {/* Boolean flags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="grid grid-cols-2 gap-2">
                {booleanFields.map(({ name, label }) => (
                  <label key={name} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      {...register(name as keyof MenuItemFormValues)}
                    />
                    {label}
                  </label>
                ))}
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
