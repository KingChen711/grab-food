import type { Metadata } from 'next'
import Link from 'next/link'

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <GoogleSignInButton />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <LoginForm />

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
        <Link href="/register" className="font-medium text-brand hover:underline">
          Create account
        </Link>
      </div>
    </div>
  )
}
