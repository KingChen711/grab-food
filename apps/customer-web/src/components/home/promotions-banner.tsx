import Link from 'next/link'

const PROMOTIONS = [
  {
    id: '1',
    title: 'Free delivery on your first order',
    description: 'Use code WELCOME at checkout',
    cta: 'Order now',
    href: '/search',
    gradient: 'from-brand-500 to-brand-700',
    emoji: '🛵',
  },
  {
    id: '2',
    title: '20% off all weekend orders',
    description: 'Valid Saturday & Sunday',
    cta: 'Explore deals',
    href: '/promotions',
    gradient: 'from-orange-500 to-rose-600',
    emoji: '🎉',
  },
]

export function PromotionsBanner() {
  return (
    <section className="container py-8">
      <h2 className="mb-4 text-lg font-semibold">Deals & promotions</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {PROMOTIONS.map((promo) => (
          <Link
            key={promo.id}
            href={promo.href}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r ${promo.gradient} p-6 text-white transition-transform hover:scale-[1.01]`}
          >
            <div className="relative z-10">
              <p className="text-xl font-bold leading-tight">{promo.title}</p>
              <p className="mt-1 text-sm text-white/80">{promo.description}</p>
              <span className="mt-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm transition-colors group-hover:bg-white/30">
                {promo.cta} →
              </span>
            </div>
            <span className="absolute -bottom-3 -right-2 text-8xl opacity-20 transition-all group-hover:scale-110 group-hover:opacity-30">
              {promo.emoji}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
