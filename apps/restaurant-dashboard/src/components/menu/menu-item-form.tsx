'use client'

import type { MenuItem } from '@grab/types'
import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import { ImageUploader } from '@/components/shared/image-uploader'
import { getFieldErrors } from '@/lib/api/api-error'
import { uploadApi } from '@/lib/api/upload.api'

const toOptionalInt = (min: number, minMsg?: string) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(min, minMsg).optional(),
  )

const variantSchema = z.object({
  name: z.string().min(1, 'Name required'),
  priceAdjustment: z.coerce.number().min(0).default(0),
  isDefault: z.boolean().default(false),
})

const addonSchema = z.object({
  name: z.string().min(1, 'Name required'),
  price: z.coerce.number().min(0).default(0),
  maxQuantity: z.coerce.number().int().min(1).default(1),
  isRequired: z.boolean().default(false),
})

const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  basePrice: z.coerce.number().min(0, 'Price must be >= 0'),
  currency: z.string().default('VND'),
  prepTimeMinutes: toOptionalInt(1, 'Prep time must be at least 1 minute'),
  calories: toOptionalInt(0),
  isAvailable: z.boolean().default(true),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isHalal: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  spicyLevel: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  ),
  tags: z.string().optional(),
  variants: z.array(variantSchema).default([]),
  addons: z.array(addonSchema).default([]),
})

type InternalFormValues = z.infer<typeof menuItemSchema>

export type MenuItemFormValues = Omit<InternalFormValues, 'tags'> & { tags: string[] }

interface MenuItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<MenuItem>
  onSubmit: (values: MenuItemFormValues) => Promise<void>
  title?: string
}

const booleanFlags: Array<{ name: keyof InternalFormValues; label: string }> = [
  { name: 'isAvailable', label: 'Available' },
  { name: 'isVegetarian', label: 'Vegetarian' },
  { name: 'isVegan', label: 'Vegan' },
  { name: 'isGlutenFree', label: 'Gluten Free' },
  { name: 'isHalal', label: 'Halal' },
  { name: 'isSpicy', label: 'Spicy' },
]

function buildDefaults(initialValues?: Partial<MenuItem>): InternalFormValues {
  return {
    name: initialValues?.name ?? '',
    description: initialValues?.description ?? '',
    imageUrl: initialValues?.imageUrl ?? '',
    basePrice: initialValues?.basePrice ?? 0,
    currency: initialValues?.currency ?? 'VND',
    prepTimeMinutes: initialValues?.prepTimeMinutes ?? undefined,
    calories: initialValues?.calories ?? undefined,
    isAvailable: initialValues?.isAvailable ?? true,
    isVegetarian: initialValues?.isVegetarian ?? false,
    isVegan: initialValues?.isVegan ?? false,
    isGlutenFree: initialValues?.isGlutenFree ?? false,
    isHalal: initialValues?.isHalal ?? false,
    isSpicy: initialValues?.isSpicy ?? false,
    spicyLevel: initialValues?.spicyLevel ?? undefined,
    tags: initialValues?.tags?.join(', ') ?? '',
    variants:
      initialValues?.variants?.map((v) => ({
        name: v.name,
        priceAdjustment: v.priceAdjustment,
        isDefault: v.isDefault,
      })) ?? [],
    addons:
      initialValues?.addons?.map((a) => ({
        name: a.name,
        price: a.price,
        maxQuantity: a.maxQuantity,
        isRequired: a.isRequired,
      })) ?? [],
  }
}

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
    control,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InternalFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: buildDefaults(initialValues),
  })

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: 'variants',
  })

  const {
    fields: addonFields,
    append: appendAddon,
    remove: removeAddon,
  } = useFieldArray({
    control,
    name: 'addons',
  })

  const isSpicy = watch('isSpicy')
  const pendingUploadId = useRef<string | null>(null)

  useEffect(() => {
    if (open) {
      pendingUploadId.current = null
      reset(buildDefaults(initialValues))
    }
  }, [open, initialValues, reset])

  const handleFormSubmit = async (values: InternalFormValues) => {
    const submitValues: MenuItemFormValues = {
      ...values,
      tags: values.tags
        ? values.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    }
    try {
      await onSubmit(submitValues)
      if (pendingUploadId.current) {
        void uploadApi.claim(pendingUploadId.current)
        pendingUploadId.current = null
      }
      onOpenChange(false)
    } catch (err) {
      const knownFields = new Set(Object.keys(menuItemSchema.shape))
      for (const [field, msg] of Object.entries(getFieldErrors(err))) {
        if (knownFields.has(field)) setError(field as keyof InternalFormValues, { message: msg })
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed inset-0 z-50 m-auto h-fit max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input placeholder="Item name" error={!!errors.name} {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="Optional description" {...register('description')} />
            </div>

            {/* Image */}
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
                  label="Item Image"
                  hint="Recommended: 1:1 square"
                />
              )}
            />

            {/* Price, Currency & Prep Time */}
            <div className="grid grid-cols-3 gap-4">
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
                <label className="text-sm font-medium">Currency</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('currency')}
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="SGD">SGD</option>
                  <option value="THB">THB</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prep Time (min)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 15"
                  error={!!errors.prepTimeMinutes}
                  {...register('prepTimeMinutes')}
                />
                {errors.prepTimeMinutes && (
                  <p className="text-xs text-destructive">{errors.prepTimeMinutes.message}</p>
                )}
              </div>
            </div>

            {/* Calories */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Calories</label>
              <Input
                type="number"
                min="0"
                placeholder="Optional"
                error={!!errors.calories}
                {...register('calories')}
              />
              {errors.calories && (
                <p className="text-xs text-destructive">{errors.calories.message}</p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <Input
                placeholder="e.g. popular, spicy, new (comma-separated)"
                {...register('tags')}
              />
              <p className="text-xs text-muted-foreground">Separate multiple tags with commas</p>
            </div>

            {/* Boolean flags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="grid grid-cols-2 gap-2">
                {booleanFlags.map(({ name, label }) => (
                  <label key={name} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      {...register(name as keyof InternalFormValues)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Spicy Level (conditional) */}
            {isSpicy && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Spicy Level</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('spicyLevel')}
                >
                  <option value="">Select level</option>
                  <option value={1}>🌶 Mild</option>
                  <option value={2}>🌶🌶 Medium</option>
                  <option value={3}>🌶🌶🌶 Hot</option>
                </select>
              </div>
            )}

            {/* Variants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Variants</label>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() => appendVariant({ name: '', priceAdjustment: 0, isDefault: false })}
                >
                  <Plus className="h-3 w-3" />
                  Add Variant
                </button>
              </div>
              {variantFields.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="grid grid-cols-[1fr_100px_70px_32px] gap-2 text-xs text-muted-foreground">
                    <span>Name</span>
                    <span>Price Adj.</span>
                    <span>Default</span>
                    <span />
                  </div>
                  {variantFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_100px_70px_32px] items-center gap-2"
                    >
                      <Input
                        placeholder="e.g. Large"
                        error={!!errors.variants?.[index]?.name}
                        {...register(`variants.${index}.name`)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register(`variants.${index}.priceAdjustment`)}
                      />
                      <label className="flex items-center justify-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          {...register(`variants.${index}.isDefault`)}
                        />
                        Yes
                      </label>
                      <button
                        type="button"
                        className="flex items-center justify-center rounded-md p-1 text-destructive hover:bg-destructive/10"
                        onClick={() => removeVariant(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Addons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Add-ons</label>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={() =>
                    appendAddon({ name: '', price: 0, maxQuantity: 1, isRequired: false })
                  }
                >
                  <Plus className="h-3 w-3" />
                  Add Add-on
                </button>
              </div>
              {addonFields.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="grid grid-cols-[1fr_80px_70px_70px_32px] gap-2 text-xs text-muted-foreground">
                    <span>Name</span>
                    <span>Price</span>
                    <span>Max Qty</span>
                    <span>Required</span>
                    <span />
                  </div>
                  {addonFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_80px_70px_70px_32px] items-center gap-2"
                    >
                      <Input
                        placeholder="e.g. Extra sauce"
                        error={!!errors.addons?.[index]?.name}
                        {...register(`addons.${index}.name`)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register(`addons.${index}.price`)}
                      />
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        {...register(`addons.${index}.maxQuantity`)}
                      />
                      <label className="flex items-center justify-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          {...register(`addons.${index}.isRequired`)}
                        />
                        Yes
                      </label>
                      <button
                        type="button"
                        className="flex items-center justify-center rounded-md p-1 text-destructive hover:bg-destructive/10"
                        onClick={() => removeAddon(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
