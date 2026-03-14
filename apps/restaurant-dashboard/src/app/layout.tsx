import './globals.css'

import type { Metadata } from 'next'
import { Toaster } from 'sonner'

import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'

export const metadata: Metadata = {
  title: { default: 'Restaurant Dashboard', template: '%s | GrabFood Dashboard' },
  description: 'Manage your restaurant on GrabFood',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
