import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import ModelCard from '@/components/catalog/ModelCard'
import { ArrowRight, MapPin, Shield, Leaf } from 'lucide-react'

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('landing')
  const supabase = await createClient()

  const [{ data: featured }, { count: modelCount }] = await Promise.all([
    supabase.from('models').select('*').eq('is_active', true).order('likes', { ascending: false }).limit(8),
    supabase.from('models').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-3 py-1.5 rounded-full mb-8">
            <MapPin size={11} />
            Starting in Lisbon, Portugal
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            {t('hero')}
          </h1>

          <p className="text-[var(--muted)] text-lg md:text-xl mb-10 leading-relaxed max-w-xl mx-auto">
            {t('heroSub')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Link href={`/${locale}/catalog`}
              className="inline-flex items-center gap-2 bg-[var(--accent)] text-white font-semibold px-7 py-3.5 rounded-[var(--radius)] hover:bg-[var(--fg)] transition-colors text-sm">
              {t('cta')} <ArrowRight size={15} />
            </Link>
            <Link href={`/${locale}/auth/signup`}
              className="inline-flex items-center gap-2 border border-[var(--border)] bg-white font-semibold px-7 py-3.5 rounded-[var(--radius)] hover:border-[var(--fg)] transition-colors text-sm">
              {t('ctaMaker')}
            </Link>
          </div>

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-5 text-sm text-[var(--muted)]">
            <span>{(modelCount ?? 177).toLocaleString()} models</span>
            <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
            <span>Free to browse</span>
            <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
            <span>Open source licenses</span>
          </div>
        </div>
      </section>

      {/* Featured models */}
      {featured && featured.length > 0 && (
        <section className="border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Popular models</h2>
                <p className="text-[var(--muted)] text-sm mt-1">Top-rated designs from the community</p>
              </div>
              <Link href={`/${locale}/catalog`}
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--fg)] flex items-center gap-1 transition-colors">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featured.map(model => <ModelCard key={model.id} model={model} locale={locale} />)}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">{t('howTitle')}</h2>
            <p className="text-[var(--muted)] text-base max-w-sm mx-auto">From model to doorstep in three simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { num: '01', title: t('step1Title'), desc: t('step1'), icon: Shield },
              { num: '02', title: t('step2Title'), desc: t('step2'), icon: MapPin },
              { num: '03', title: t('step3Title'), desc: t('step3'), icon: Leaf },
            ].map(({ num, title, desc, icon: Icon }) => (
              <div key={num}>
                <p className="font-mono text-5xl font-bold text-[var(--border)] leading-none mb-4 select-none">{num}</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-[var(--radius)] bg-[var(--fg)] flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-base">{title}</h3>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-[var(--fg)] text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Have a 3D printer?</h2>
          <p className="text-white/60 text-lg mb-8">Your printer earns while you sleep.</p>
          <Link href={`/${locale}/auth/signup`}
            className="inline-flex items-center gap-2 bg-[var(--accent)] text-white font-semibold px-7 py-3.5 rounded-[var(--radius)] hover:bg-white hover:text-[var(--fg)] transition-colors text-sm">
            Become a maker <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
