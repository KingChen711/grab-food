'use client'

import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useRegisterEmail, useRegisterPhone } from '@/hooks/use-auth-query'
import {
  type RegisterEmailInput,
  registerEmailSchema,
  type RegisterPhoneInput,
  registerPhoneSchema,
} from '@/lib/validators/auth.schemas'

type Tab = 'email' | 'phone'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function RegisterForm() {
  const [tab, setTab] = useState<Tab>('email')
  const [showPassword, setShowPassword] = useState(false)
  const registerEmail = useRegisterEmail()
  const registerPhone = useRegisterPhone()

  const emailForm = useForm<RegisterEmailInput>({
    resolver: zodResolver(registerEmailSchema),
    defaultValues: { email: '', password: '', fullName: '', phone: '' },
  })

  const phoneForm = useForm<RegisterPhoneInput>({
    resolver: zodResolver(registerPhoneSchema),
    defaultValues: { phone: '', fullName: '', otp: '' },
  })

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg bg-muted p-1">
        {(['email', 'phone'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
              tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'email' ? 'Email' : 'Phone'}
          </button>
        ))}
      </div>

      {tab === 'email' ? (
        <form
          onSubmit={emailForm.handleSubmit((data) => registerEmail.mutate(data))}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label htmlFor="reg-fullname" className="text-sm font-medium">
              Full name *
            </label>
            <Input
              id="reg-fullname"
              placeholder="John Doe"
              leftIcon={<User className="h-4 w-4" />}
              error={!!emailForm.formState.errors.fullName}
              {...emailForm.register('fullName')}
            />
            <FieldError message={emailForm.formState.errors.fullName?.message} />
          </div>
          <div className="space-y-1">
            <label htmlFor="reg-email" className="text-sm font-medium">
              Email *
            </label>
            <Input
              id="reg-email"
              placeholder="you@example.com"
              type="email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={!!emailForm.formState.errors.email}
              {...emailForm.register('email')}
            />
            <FieldError message={emailForm.formState.errors.email?.message} />
          </div>
          <div className="space-y-1">
            <label htmlFor="reg-phone" className="text-sm font-medium">
              Phone number
            </label>
            <Input
              id="reg-phone"
              placeholder="+84..."
              type="tel"
              leftIcon={<Phone className="h-4 w-4" />}
              error={!!emailForm.formState.errors.phone}
              {...emailForm.register('phone')}
            />
            <FieldError message={emailForm.formState.errors.phone?.message} />
          </div>
          <div className="space-y-1">
            <label htmlFor="reg-password" className="text-sm font-medium">
              Password *
            </label>
            <Input
              id="reg-password"
              placeholder="Create a password"
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
              error={!!emailForm.formState.errors.password}
              {...emailForm.register('password')}
            />
            <FieldError message={emailForm.formState.errors.password?.message} />
          </div>
          <p className="text-xs text-muted-foreground">
            Must be 8+ chars with uppercase, lowercase and a number.
          </p>
          <Button type="submit" className="w-full" loading={registerEmail.isPending}>
            Create account
          </Button>
        </form>
      ) : (
        <form
          onSubmit={phoneForm.handleSubmit((data) => registerPhone.mutate(data))}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label htmlFor="reg-phone-fullname" className="text-sm font-medium">
              Full name *
            </label>
            <Input
              id="reg-phone-fullname"
              placeholder="John Doe"
              leftIcon={<User className="h-4 w-4" />}
              error={!!phoneForm.formState.errors.fullName}
              {...phoneForm.register('fullName')}
            />
            <FieldError message={phoneForm.formState.errors.fullName?.message} />
          </div>
          <div className="space-y-1">
            <label htmlFor="reg-phone-number" className="text-sm font-medium">
              Phone number *
            </label>
            <Input
              id="reg-phone-number"
              placeholder="+84..."
              type="tel"
              leftIcon={<Phone className="h-4 w-4" />}
              error={!!phoneForm.formState.errors.phone}
              {...phoneForm.register('phone')}
            />
            <FieldError message={phoneForm.formState.errors.phone?.message} />
          </div>
          <div className="space-y-1">
            <label htmlFor="reg-phone-otp" className="text-sm font-medium">
              OTP *
            </label>
            <Input
              id="reg-phone-otp"
              placeholder="6-digit code"
              maxLength={6}
              error={!!phoneForm.formState.errors.otp}
              {...phoneForm.register('otp')}
            />
            <FieldError message={phoneForm.formState.errors.otp?.message} />
          </div>
          <Button type="submit" className="w-full" loading={registerPhone.isPending}>
            Create account
          </Button>
        </form>
      )}
    </div>
  )
}
