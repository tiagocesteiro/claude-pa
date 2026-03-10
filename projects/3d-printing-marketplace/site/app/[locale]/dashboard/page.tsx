import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Package, Star, TrendingUp, Clock } from 'lucide-react'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('dashboard')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/signin`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role === 'buyer') redirect(`/${locale}/account`)

  const [{ count: pending }, { count: total }, { data: reviews }] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('maker_id', user.id).eq('status', 'pending'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('maker_id', user.id),
    supabase.from('reviews').select('quality_rating, delivery_rating').eq('reviewee_id', user.id),
  ])

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.quality_rating + r.delivery_rating) / 2, 0) / reviews.length
    : null

  const stats = [
    { label: t('pendingOrders'), value: pending ?? 0, icon: Clock, accent: true },
    { label: t('totalOrders'), value: total ?? 0, icon: Package, accent: false },
    { label: t('avgRating'), value: avgRating ? avgRating.toFixed(1) : '—', icon: Star, accent: false },
    { label: 'Reviews', value: reviews?.length ?? 0, icon: TrendingUp, accent: false },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
      <p className="text-[var(--muted)] text-sm mb-8">Welcome back, {profile?.display_name}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`border rounded-[var(--radius)] p-4 ${accent && (pending ?? 0) > 0 ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)] bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
              <Icon size={16} className={accent && (pending ?? 0) > 0 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--accent-light)] border border-[var(--accent)]/30 rounded-[var(--radius)] p-5 text-sm">
        <p className="font-semibold mb-1">Getting started</p>
        <ol className="list-decimal list-inside text-[var(--muted)] space-y-1">
          <li>Go to <a href={`/${locale}/dashboard/listings`} className="text-[var(--accent)] hover:underline">My Listings</a> and add models from the catalog</li>
          <li>Set your price and estimated print time for each model</li>
          <li>When orders come in, confirm them in <a href={`/${locale}/dashboard/orders`} className="text-[var(--accent)] hover:underline">Orders</a></li>
          <li>Print, ship, and add the tracking number to complete delivery</li>
        </ol>
      </div>
    </div>
  )
}
