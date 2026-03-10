import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, trackingUrl } from '@/lib/utils'
import { CheckCircle, Clock, Package, Truck, Star } from 'lucide-react'

const STEPS = ['pending','confirmed','printing','shipped','delivered'] as const
const STEP_ICONS: Record<string, any> = { pending: Clock, confirmed: CheckCircle, printing: Package, shipped: Truck, delivered: CheckCircle }

export default async function OrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const t = await getTranslations('order')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order } = await supabase.from('orders')
    .select('*, listing:maker_listings(model:models(name,thumbnail)), maker:profiles!maker_id(display_name, location_city), buyer:profiles!buyer_id(display_name)')
    .eq('id', id).single()

  if (!order) notFound()
  if (order.buyer_id !== user?.id && order.maker_id !== user?.id) notFound()

  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number])
  const { data: review } = await supabase.from('reviews').select('id').eq('order_id', id).maybeSingle()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/${locale}/account`} className="text-sm text-[var(--muted)] hover:text-[var(--fg)] mb-6 inline-flex items-center gap-1">
        &larr; Back
      </Link>

      <div className="flex items-center justify-between mb-6 mt-4">
        <h1 className="text-2xl font-bold">Order</h1>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-[var(--accent-light)] text-[var(--accent)]'
        }`}>
          {t(`status.${order.status}` as any)}
        </span>
      </div>

      {/* Status timeline */}
      <div className="flex items-center mb-8">
        {STEPS.map((step, i) => {
          const done = i <= currentStep
          const Icon = STEP_ICONS[step]
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-[var(--fg)]' : 'bg-[var(--border)]'}`}>
                  <Icon size={14} className={done ? 'text-white' : 'text-[var(--muted)]'} />
                </div>
                <span className="text-[10px] mt-1 text-[var(--muted)] text-center hidden sm:block capitalize">{step}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-[var(--fg)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Details */}
      <div className="border border-[var(--border)] rounded-[var(--radius)] p-5 bg-white space-y-3 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Model</span>
          <span className="font-medium">{order.listing?.model?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Maker</span>
          <Link href={`/${locale}/maker/${order.maker_id}`} className="hover:text-[var(--accent)]">
            {order.maker?.display_name}
          </Link>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Payment</span>
          <span className="capitalize">{order.payment_method}</span>
        </div>
        <div className="h-px bg-[var(--border)]" />
        <div className="flex justify-between"><span className="text-[var(--muted)]">Item</span><span>{formatPrice(order.unit_price)}</span></div>
        <div className="flex justify-between"><span className="text-[var(--muted)]">Delivery</span><span>{formatPrice(order.delivery_fee)}</span></div>
        <div className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(order.total_price)}</span></div>
      </div>

      {order.delivery_address && (
        <div className="text-sm text-[var(--muted)] mb-4 border border-[var(--border)] rounded-[var(--radius)] p-4 bg-white">
          <p className="font-medium text-[var(--fg)] mb-1">Delivery address</p>
          <p>{(order.delivery_address as any).line1}</p>
          <p>{(order.delivery_address as any).postal_code} {(order.delivery_address as any).city}</p>
          <p>{(order.delivery_address as any).country}</p>
        </div>
      )}

      {order.tracking_number && (
        <a href={trackingUrl(order.tracking_carrier || 'ctt', order.tracking_number)}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline mb-4">
          <Truck size={14} />
          {t('trackDelivery')} — {order.tracking_number}
        </a>
      )}

      {order.status === 'delivered' && !review && (
        <Link href={`/${locale}/order/${id}/review`}
          className="flex items-center gap-2 w-full justify-center bg-[var(--fg)] text-white py-3 rounded-[var(--radius)] font-semibold text-sm hover:bg-[var(--accent)] transition-colors">
          <Star size={16} />
          {t('leaveReview')}
        </Link>
      )}
    </div>
  )
}
