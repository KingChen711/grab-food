import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Navbar } from '@/components/layout/navbar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileNav />
    </div>
  )
}
