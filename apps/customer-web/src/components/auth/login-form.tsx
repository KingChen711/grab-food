'use client'

import { Button, Input } from '@grab/ui'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail, Phone } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useLoginEmail, useLoginPhone } from '@/hooks/use-auth-query'
import {
  type LoginEmailInput,
  loginEmailSchema,
  type LoginPhoneInput,
  loginPhoneSchema,
} from '@/lib/validators/auth.schemas'

type Tab = 'email' | 'phone'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function LoginForm() {
  const [tab, setTab] = useState<Tab>('email')
  const [showPassword, setShowPassword] = useState(false)
  const loginEmail = useLoginEmail()
  const loginPhone = useLoginPhone()

  const emailForm = useForm<LoginEmailInput>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const phoneForm = useForm<LoginPhoneInput>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: { phone: '', otp: '' },
  })

  return (
    <div className="space-y-4">
      {/* Tabs */}
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
          onSubmit={emailForm.handleSubmit((data) => loginEmail.mutate(data))}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label htmlFor="login-email" className="text-sm font-medium">
              Email *
            </label>
            <Input
              id="login-email"
              placeholder="you@example.com"
              type="email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={!!emailForm.formState.errors.email}
              {...emailForm.register('email')}
            />
            <FieldError message={emailForm.formState.errors.email?.message} />
          </div>
          <div className="space-y-1">
            <label htmlFor="login-password" className="text-sm font-medium">
              Password *
            </label>
            <Input
              id="login-password"
              placeholder="Enter your password"
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              className="accent-brand"
              {...emailForm.register('rememberMe')}
            />
            <label htmlFor="rememberMe" className="text-sm text-muted-foreground">
              Remember me for 30 days
            </label>
          </div>
          <Button type="submit" className="w-full" loading={loginEmail.isPending}>
            Sign in
          </Button>
        </form>
      ) : (
        <form
          onSubmit={phoneForm.handleSubmit((data) => loginPhone.mutate(data))}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label htmlFor="login-phone" className="text-sm font-medium">
              Phone number *
            </label>
            <Input
              id="login-phone"
              placeholder="+84..."
              type="tel"
              leftIcon={<Phone className="h-4 w-4" />}
              error={!!phoneForm.formState.errors.phone}
              {...phoneForm.register('phone')}
            />
            <FieldError message={phoneForm.formState.errors.phone?.message} />
          </div>
          <div className="space-y-1">
            <label htmlFor="login-otp" className="text-sm font-medium">
              OTP *
            </label>
            <Input
              id="login-otp"
              placeholder="6-digit code"
              maxLength={6}
              error={!!phoneForm.formState.errors.otp}
              {...phoneForm.register('otp')}
            />
            <FieldError message={phoneForm.formState.errors.otp?.message} />
          </div>
          <Button type="submit" className="w-full" loading={loginPhone.isPending}>
            Sign in
          </Button>
        </form>
      )}
    </div>
  )
}
