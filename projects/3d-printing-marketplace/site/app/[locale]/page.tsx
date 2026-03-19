import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import ModelCard from '@/components/catalog/ModelCard'
import RevealObserver from '@/components/landing/RevealObserver'
import { ArrowRight, MapPin, Package } from 'lucide-react'

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('landing')
  const supabase = await createClient()

  const [{ data: featured }, { count: modelCount }] = await Promise.all([
    supabase.from('models').select('*').eq('is_active', true).order('likes', { ascending: false }).limit(8),
    supabase.from('models').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const count = (modelCount ?? 177).toLocaleString()

  return (
    <div>
      <RevealObserver />

      {/* ——— HERO ——— */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 overflow-hidden">

        {/* Gradient bg */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(234,88,12,0.15) 0%, transparent 65%), radial-gradient(ellipse 60% 50% at 80% 110%, rgba(249,115,22,0.10) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(234,88,12,0.07) 0%, transparent 55%)'
        }} />

        {/* Animated grid */}
        <div className="hero-grid absolute inset-0 pointer-events-none" />

        {/* Orbs */}
        <div className="orb orb-1 absolute pointer-events-none" />
        <div className="orb orb-2 absolute pointer-events-none" />
        <div className="orb orb-3 absolute pointer-events-none" />

        {/* Floating context cards — desktop only */}
        <div className="hidden lg:block">
          <div className="f-card-1 absolute flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-lg border border-[var(--border)] text-sm font-semibold whitespace-nowrap z-10">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            Marco is printing nearby
          </div>
          <div className="f-card-2 absolute flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-lg border border-[var(--border)] text-sm font-semibold whitespace-nowrap z-10">
            <Package size={15} className="text-[var(--accent)] flex-shrink-0" />
            Order confirmed · 2 min ago
          </div>
          <div className="f-card-3 absolute flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-lg border border-[var(--border)] text-sm font-semibold whitespace-nowrap z-10">
            <span className="text-yellow-400">★</span> 4.9 · 217 reviews
          </div>
          <div className="f-card-4 absolute flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-lg border border-[var(--border)] text-sm font-semibold whitespace-nowrap z-10">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
            Delivered in Lisbon · Today
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-3xl hero-animate">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase bg-[var(--accent-light)] border border-orange-200 text-[var(--accent)] px-3.5 py-1.5 rounded-full mb-7 font-mono">
            <MapPin size={9} />
            Starting in Lisbon, Portugal
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.0] tracking-[-0.04em] mb-6">
            {t('hero').split(',')[0]},<br />
            <span className="gradient-headline">{t('hero').split(',')[1]?.trim() ?? 'Print Locally'}</span>
          </h1>

          <p className="text-[var(--muted)] text-lg md:text-xl mb-9 leading-relaxed max-w-md mx-auto">
            Browse {count} curated models and get them printed by a verified maker near you. Same city. Lower cost. Zero shipping waste.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Link
              href={`/${locale}/catalog`}
              className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-[var(--radius)] text-sm transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)', boxShadow: '0 4px 20px rgba(234,88,12,0.35)' }}
            >
              {t('cta')} <ArrowRight size={15} />
            </Link>
            <Link
              href={`/${locale}/auth/signup`}
              className="inline-flex items-center gap-2 bg-white border border-[var(--border)] font-semibold px-7 py-3.5 rounded-[var(--radius)] hover:border-[var(--accent)] hover:-translate-y-0.5 transition-all text-sm shadow-sm"
            >
              {t('ctaMaker')}
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted)] font-mono flex-wrap">
            <span>{count} models</span>
            <span className="w-1 h-1 rounded-full bg-orange-200" />
            <span>Free to browse</span>
            <span className="w-1 h-1 rounded-full bg-orange-200" />
            <span>Open licenses</span>
            <span className="w-1 h-1 rounded-full bg-orange-200" />
            <span>Verified makers</span>
          </div>
        </div>
      </section>

      {/* ——— TRUST BAR ——— */}
      <div className="bg-white border-y border-[var(--border)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-8 flex-wrap">
          {[
            { icon: '🛡️', text: 'Buyer protection on every order' },
            { icon: '📍', text: 'Local maker within 20 km' },
            { icon: '🌱', text: 'Zero international shipping' },
            { icon: '⚡', text: 'Ready in 2–5 days' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
              <span className="w-7 h-7 rounded-lg bg-[var(--accent-light)] flex items-center justify-center text-sm flex-shrink-0">{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ——— FEATURED MODELS ——— */}
      {featured && featured.length > 0 && (
        <section className="px-6 py-24">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
              <div>
                <p className="reveal text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] font-mono mb-3">Popular right now</p>
                <h2 className="reveal reveal-delay-1 text-3xl md:text-4xl font-extrabold tracking-tight">Top-rated designs</h2>
                <p className="reveal reveal-delay-2 text-[var(--muted)] text-base mt-2">Handpicked models loved by buyers across Lisbon.</p>
              </div>
              <Link
                href={`/${locale}/catalog`}
                className="reveal text-sm font-semibold text-[var(--accent)] flex items-center gap-1 hover:gap-2 transition-all whitespace-nowrap"
              >
                View all {count} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featured.map((model, i) => (
                <div key={model.id} className={`reveal${i > 0 ? ` reveal-delay-${Math.min(i, 3)}` : ''}`}>
                  <ModelCard model={model} locale={locale} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ——— HOW IT WORKS ——— */}
      <section className="bg-white border-y border-[var(--border)] px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="reveal text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] font-mono mb-3">Simple by design</p>
            <h2 className="reveal reveal-delay-1 text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{t('howTitle')}</h2>
            <p className="reveal reveal-delay-2 text-[var(--muted)] text-base max-w-sm mx-auto">From model to your door in three steps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-0 relative">
            {/* Connecting line */}
            <div
              className="hidden md:block absolute top-8 left-[16.666%] right-[16.666%] h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #F0E8E0, #EA580C, #F0E8E0, transparent)' }}
            />

            {[
              { num: '01', title: t('step1Title'), desc: t('step1'), icon: '🔍' },
              { num: '02', title: t('step2Title'), desc: t('step2'), icon: '📍' },
              { num: '03', title: t('step3Title'), desc: t('step3'), icon: '📦' },
            ].map(({ num, title, desc, icon }, i) => (
              <div key={num} className={`reveal${i > 0 ? ` reveal-delay-${i}` : ''} px-8 text-center group`}>
                <div className="flex justify-center mb-6">
                  <div
                    className="w-16 h-16 rounded-full bg-[var(--accent-light)] border-2 border-orange-200 flex items-center justify-center font-mono font-extrabold text-xl text-[var(--accent)] relative z-10 group-hover:scale-110 transition-all"
                    style={{ boxShadow: '0 4px 16px rgba(234,88,12,0.18)' }}
                  >
                    {num}
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center text-xl mx-auto mb-4 shadow-sm">{icon}</div>
                <h3 className="font-bold text-base mb-2 tracking-tight">{title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— WHY PRINTPAL ——— */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <p className="reveal text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] font-mono mb-3">Why buyers choose us</p>
          <h2 className="reveal reveal-delay-1 text-3xl md:text-4xl font-extrabold tracking-tight mb-10">Built for the buyer</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Wide dark card */}
            <div
              className="reveal md:col-span-2 rounded-2xl p-7 text-white"
              style={{ background: 'linear-gradient(135deg, #1A0F00, #2D1800)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg mb-4">🌍</div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">Local first, global catalog</h3>
              <p className="text-white/55 text-sm leading-relaxed">Access thousands of designs from around the world, printed by someone in your city. The best of both.</p>
            </div>

            {[
              { icon: '🛡️', title: 'Buyer protection', desc: "Every order is covered. If it's wrong, we fix it." },
              { icon: '⚡', title: 'Fast turnaround', desc: 'Local makers mean 2–5 day delivery, not weeks.' },
              { icon: '🌱', title: 'Eco-conscious', desc: 'No international freight. Smaller footprint per order.' },
            ].map(({ icon, title, desc }, i) => (
              <div
                key={title}
                className={`reveal reveal-delay-${i + 1} bg-white border border-[var(--border)] rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all`}
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-lg mb-4">{icon}</div>
                <h3 className="font-bold text-sm mb-1.5 tracking-tight">{title}</h3>
                <p className="text-[var(--muted)] text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— CTA ——— */}
      <section
        className="relative px-6 py-24 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A0F00, #2D1200)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(234,88,12,0.22) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 80% 30%, rgba(249,115,22,0.15) 0%, transparent 55%)' }}
        />
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="reveal text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Ready to print something?
          </h2>
          <p className="reveal reveal-delay-1 text-white/50 text-lg mb-9">
            {count} models. Makers near you. Ready today.
          </p>
          <Link
            href={`/${locale}/catalog`}
            className="reveal reveal-delay-2 inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-[var(--radius)] text-sm hover:-translate-y-0.5 transition-all"
            style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)', boxShadow: '0 4px 24px rgba(234,88,12,0.5)' }}
          >
            Browse the catalog <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
