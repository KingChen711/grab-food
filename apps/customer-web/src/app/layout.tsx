import './globals.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from 'sonner'

import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: { default: 'GrabFood', template: '%s | GrabFood' },
  description: 'Order food from your favourite restaurants',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </ThemeProvider>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" async defer />
      </body>
    </html>
  )
}
