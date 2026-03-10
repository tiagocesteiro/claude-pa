'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

const STATUS_FLOW: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'printing',
  printing: 'shipped',
  shipped: 'delivered',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', printing: 'Printing',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}

export default function DashboardOrdersPage() {
  const pathname = usePathname()
  const locale = pathname.split('/')[1]
  const [orders, setOrders] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [tracking, setTracking] = useState<Record<string, { number: string; carrier: string }>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('orders')
          .select('*, listing:maker_listings(model:models(name)), buyer:profiles!buyer_id(display_name, location_city)')
          .eq('maker_id', data.user.id)
          .order('created_at', { ascending: false })
          .then(({ data: o }) => setOrders(o ?? []))
      }
    })
  }, [])

  const advance = async (order: any) => {
    if (order.status === 'shipped') {
      const t = tracking[order.id]
      if (!t?.number) { alert('Please enter tracking number first'); return }
    }
    const nextStatus = STATUS_FLOW[order.status]
    if (!nextStatus) return
    const supabase = createClient()
    const update: any = { status: nextStatus }
    if (order.status === 'shipped') {
      update.tracking_number = tracking[order.id]?.number
      update.tracking_carrier = tracking[order.id]?.carrier || 'ctt'
    }
    await supabase.from('orders').update(update).eq('id', order.id)
    setOrders(o => o.map(x => x.id === order.id ? { ...x, ...update } : x))
  }

  const setT = (orderId: string, field: 'number' | 'carrier', value: string) => {
    setTracking(t => ({ ...t, [orderId]: { ...t[orderId], [field]: value } }))
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    printing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-[var(--accent-light)] text-[var(--accent)]',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  if (!orders.length) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Orders</h1>
        <p className="text-[var(--muted)] text-sm py-12 text-center">No orders yet. Add listings to start receiving orders.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="flex flex-col gap-3">
        {orders.map(order => (
          <div key={order.id} className="border border-[var(--border)] rounded-[var(--radius)] bg-white overflow-hidden">
            <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(e => e === order.id ? null : order.id)}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{order.listing?.model?.name}</p>
                <p className="text-xs text-[var(--muted)]">{order.buyer?.display_name} · {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
                <span className="font-bold text-sm">{formatPrice(order.total_price)}</span>
                <ChevronDown size={16} className={`text-[var(--muted)] transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {expanded === order.id && (
              <div className="border-t border-[var(--border)] p-4 space-y-3 text-sm">
                {order.delivery_address && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] mb-1">DELIVERY ADDRESS</p>
                    <p>{(order.delivery_address as any).line1}</p>
                    <p>{(order.delivery_address as any).postal_code} {(order.delivery_address as any).city}</p>
                  </div>
                )}
                {order.notes && <p className="text-[var(--muted)] italic">&quot;{order.notes}&quot;</p>}

                {order.status === 'printing' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--muted)]">TRACKING (enter before marking shipped)</p>
                    <div className="flex gap-2">
                      <select value={tracking[order.id]?.carrier || 'ctt'} onChange={e => setT(order.id, 'carrier', e.target.value)}
                        className="border border-[var(--border)] rounded px-2 py-1.5 text-sm">
                        <option value="ctt">CTT</option>
                        <option value="dhl">DHL</option>
                        <option value="ups">UPS</option>
                        <option value="fedex">FedEx</option>
                      </select>
                      <input value={tracking[order.id]?.number || ''} onChange={e => setT(order.id, 'number', e.target.value)}
                        placeholder="Tracking number"
                        className="flex-1 border border-[var(--border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                    </div>
                  </div>
                )}

                {STATUS_FLOW[order.status] && (
                  <button onClick={() => advance(order)}
                    className="w-full bg-[var(--fg)] text-white py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--accent)] transition-colors">
                    {order.status === 'pending' ? 'Confirm order' :
                     order.status === 'confirmed' ? 'Start printing' :
                     order.status === 'printing' ? 'Mark as shipped' : 'Mark as delivered'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
