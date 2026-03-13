'use client'

import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useResetPassword } from '@/hooks/use-auth-query'
import { type ResetPasswordInput, resetPasswordSchema } from '@/lib/validators/auth.schemas'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function ResetPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const resetPassword = useResetPassword()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: defaultEmail ?? '', otp: '', newPassword: '' },
  })

  return (
    <form onSubmit={form.handleSubmit((data) => resetPassword.mutate(data))} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="reset-email" className="text-sm font-medium">
          Email *
        </label>
        <Input
          id="reset-email"
          placeholder="you@example.com"
          type="email"
          leftIcon={<Mail className="h-4 w-4" />}
          error={!!form.formState.errors.email}
          {...form.register('email')}
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>
      <div className="space-y-1">
        <label htmlFor="reset-otp" className="text-sm font-medium">
          OTP *
        </label>
        <Input
          id="reset-otp"
          placeholder="6-digit code"
          maxLength={6}
          error={!!form.formState.errors.otp}
          {...form.register('otp')}
        />
        <FieldError message={form.formState.errors.otp?.message} />
      </div>
      <div className="space-y-1">
        <label htmlFor="reset-new-password" className="text-sm font-medium">
          New password *
        </label>
        <Input
          id="reset-new-password"
          placeholder="Create a new password"
          type={showPassword ? 'text' : 'password'}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="flex h-8 w-8 items-center justify-center"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={!!form.formState.errors.newPassword}
          {...form.register('newPassword')}
        />
        <FieldError message={form.formState.errors.newPassword?.message} />
      </div>
      <Button type="submit" className="w-full" loading={resetPassword.isPending}>
        Reset password
      </Button>
    </form>
  )
}
