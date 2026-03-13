'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{sentTo ? 'Enter your OTP' : 'Reset password'}</h1>
        <p className="text-sm text-muted-foreground">
          {sentTo
            ? `We sent a 6-digit OTP to ${sentTo}`
            : 'Enter your email to receive a reset OTP'}
        </p>
      </div>

      {sentTo ? (
        <ResetPasswordForm defaultEmail={sentTo} />
      ) : (
        <ForgotPasswordForm onSuccess={(email) => setSentTo(email)} />
      )}

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
