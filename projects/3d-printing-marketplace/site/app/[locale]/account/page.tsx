import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { Package, Clock } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  printing: 'bg-purple-100 text-purple-700', shipped: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/signin`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: orders } = await supabase.from('orders')
    .select('*, listing:maker_listings(model:models(name,thumbnail)), maker:profiles!maker_id(display_name)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{profile?.display_name}</h1>
          <p className="text-[var(--muted)] text-sm">{user.email}</p>
        </div>
        {(profile?.role === 'maker' || profile?.role === 'both') && (
          <Link href={`/${locale}/dashboard`}
            className="text-sm font-medium bg-[var(--fg)] text-white px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors">
            Maker dashboard
          </Link>
        )}
      </div>

      <h2 className="font-bold text-lg mb-4">My Orders</h2>

      {!orders?.length ? (
        <div className="text-center py-16 border border-[var(--border)] rounded-[var(--radius)] bg-white">
          <Package size={32} className="mx-auto text-[var(--muted)] mb-3" />
          <p className="text-[var(--muted)] text-sm">No orders yet.</p>
          <Link href={`/${locale}/catalog`}
            className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
            Browse catalog →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order: any) => (
            <Link key={order.id} href={`/${locale}/order/${order.id}`}
              className="border border-[var(--border)] rounded-[var(--radius)] bg-white p-4 flex items-center gap-4 hover:border-[var(--fg)] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{order.listing?.model?.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {order.maker?.display_name} · {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}>
                  {order.status}
                </span>
                <span className="font-bold text-sm">{formatPrice(order.total_price)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
