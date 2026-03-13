'use client'

import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useForgotPassword } from '@/hooks/use-auth-query'
import { type ForgotPasswordInput, forgotPasswordSchema } from '@/lib/validators/auth.schemas'

export function ForgotPasswordForm({ onSuccess }: { onSuccess?: (email: string) => void }) {
  const forgotPassword = useForgotPassword()
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPassword.mutate(data, {
      onSuccess: () => {
        setSubmitted(true)
        onSuccess?.(data.email)
      },
    })
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-success/10 p-4 text-center text-sm text-success">
        If that email is registered, you&apos;ll receive an OTP shortly.
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="forgot-email" className="text-sm font-medium">
          Email *
        </label>
        <Input
          id="forgot-email"
          placeholder="you@example.com"
          type="email"
          leftIcon={<Mail className="h-4 w-4" />}
          error={!!form.formState.errors.email}
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
        Send reset OTP
      </Button>
    </form>
  )
}
