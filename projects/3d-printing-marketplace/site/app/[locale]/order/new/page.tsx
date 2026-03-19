'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { ShoppingBag, Loader2, Package, Clock } from 'lucide-react'

const DELIVERY_FEE = 4.0

const COLOR_HEX: Record<string, string> = {
  White: '#FFFFFF', Black: '#1A1A1A', Gray: '#888888', Silver: '#C0C0C0',
  Red: '#E53E3E', Orange: '#ED8936', Yellow: '#ECC94B', Green: '#38A169',
  Teal: '#319795', Blue: '#3182CE', Purple: '#805AD5', Pink: '#ED64A6',
  Brown: '#8B5E3C', Beige: '#F5E6C8', Gold: '#D4AF37', Transparent: '#E8F4FD',
}

export default function NewOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listing')

  const [locale, setLocale] = useState('en')
  const [listing, setListing] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState('')

  const [form, setForm] = useState({
    line1: '', city: '', postal_code: '', country: 'Portugal',
    notes: '', payment_method: 'mbway',
  })

  useEffect(() => {
    params.then(p => setLocale(p.locale))
  }, [params])

  useEffect(() => {
    if (!listingId) return
    const supabase = createClient()
    Promise.all([
      supabase.from('maker_listings')
        .select('*, model:models(id,name,thumbnail), maker:profiles!maker_id(id,display_name,location_city)')
        .eq('id', listingId)
        .single(),
      supabase.auth.getUser(),
    ]).then(([{ data: listingData }, { data: { user: u } }]) => {
      setListing(listingData)
      setUser(u)
      setLoading(false)
    })
  }, [listingId])

  const availableColors: string[] = listing
    ? Object.keys(listing.color_stock ?? {}).length > 0
      ? Object.keys(listing.color_stock)
      : (listing.colors ?? [])
    : []

  const colorStockCount: number = selectedColor && listing?.color_stock
    ? (listing.color_stock[selectedColor] ?? 0)
    : (listing?.stock_count ?? 0)

  const hasColors = availableColors.length > 0
  const canSubmit = !hasColors || selectedColor !== ''
  const total = listing ? listing.price + DELIVERY_FEE : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!listing || !user || !canSubmit) return
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data: order, error: err } = await supabase.from('orders').insert({
      buyer_id: user.id,
      maker_id: listing.maker_id,
      listing_id: listing.id,
      color: selectedColor || null,
      quantity: 1,
      unit_price: listing.price,
      delivery_fee: DELIVERY_FEE,
      total_price: total,
      status: 'pending',
      payment_status: 'pending',
      payment_method: form.payment_method,
      delivery_address: {
        line1: form.line1,
        city: form.city,
        postal_code: form.postal_code,
        country: form.country,
      },
      notes: form.notes || null,
    }).select().single()

    if (err || !order) {
      setError(err?.message ?? 'Failed to place order.')
      setSubmitting(false)
      return
    }

    fetch('/api/webhooks/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'order.created', order }),
    }).catch(() => {})

    router.push(`/${locale}/order/${order.id}`)
  }

  if (!listingId) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-[var(--muted)]">No listing selected. <a href={`/${locale}/catalog`} className="text-[var(--accent)] hover:underline">Browse catalog</a></p>
    </div>
  )

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <Loader2 className="animate-spin mx-auto text-[var(--muted)]" />
    </div>
  )

  if (!listing) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-[var(--muted)]">Listing not found.</p>
    </div>
  )

  if (!user) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-[var(--muted)] mb-4">Sign in to place an order.</p>
      <a href={`/${locale}/auth/signin`}
        className="inline-block bg-[var(--fg)] text-white font-semibold px-6 py-3 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors">
        Sign in
      </a>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Place order</h1>
      <div className="grid md:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">

          {hasColors && (
            <div>
              <h2 className="font-semibold mb-3">
                Choose color <span className="text-red-500">*</span>
              </h2>
              <div className="flex flex-wrap gap-3">
                {availableColors.map(colorName => {
                  const hex = COLOR_HEX[colorName] ?? '#ccc'
                  const stock = listing.color_stock?.[colorName] ?? 0
                  const isSelected = selectedColor === colorName
                  return (
                    <button key={colorName} type="button" onClick={() => setSelectedColor(colorName)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-[var(--radius)] border-2 transition-all ${
                        isSelected ? 'border-[var(--fg)] bg-gray-50' : 'border-transparent hover:border-[var(--border)]'
                      }`}>
                      <span className="w-8 h-8 rounded-full border border-black/10 block"
                        style={{ background: hex }} />
                      <span className="text-[10px] font-medium text-center w-12 leading-tight">{colorName}</span>
                      <span className={`text-[9px] ${stock > 0 ? 'text-emerald-600' : 'text-[var(--muted)]'}`}>
                        {stock > 0 ? `${stock} ready` : 'on demand'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!selectedColor && (
                <p className="text-xs text-[var(--muted)] mt-2">Select a color to continue.</p>
              )}
            </div>
          )}

          <div>
            <h2 className="font-semibold mb-3">Delivery address</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Address line 1</label>
                <input required value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]"
                  placeholder="Rua das Flores, 12" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Postal code</label>
                  <input required value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))}
                    className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]"
                    placeholder="1200-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]"
                    placeholder="Lisbon" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Payment method</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['mbway', 'transfer'] as const).map(method => (
                <label key={method}
                  className={`border rounded-[var(--radius)] p-3 cursor-pointer flex items-center gap-2 text-sm font-medium transition-colors ${
                    form.payment_method === method
                      ? 'border-[var(--fg)] bg-[var(--fg)] text-white'
                      : 'border-[var(--border)] hover:border-[var(--fg)]'
                  }`}>
                  <input type="radio" name="payment" value={method}
                    checked={form.payment_method === method}
                    onChange={() => setForm(f => ({ ...f, payment_method: method }))}
                    className="sr-only" />
                  {method === 'mbway' ? 'MB Way' : 'Bank transfer'}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes for maker <span className="text-[var(--muted)] font-normal">(optional)</span>
            </label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)] resize-none"
              placeholder="Size adjustments, special requests..." />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={submitting || !canSubmit}
            className="w-full flex items-center justify-center gap-2 bg-[var(--fg)] text-white font-semibold py-3 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
            {submitting ? 'Placing order...' : 'Place order'}
          </button>
        </form>

        <div className="md:col-span-2">
          <div className="border border-[var(--border)] rounded-[var(--radius)] p-5 bg-white sticky top-6">
            <h2 className="font-semibold mb-4">Order summary</h2>
            {listing.model?.thumbnail && (
              <div className="aspect-[4/3] rounded overflow-hidden bg-[var(--accent-light)] mb-4">
                <img src={listing.model.thumbnail} alt={listing.model.name}
                  className="w-full h-full object-cover" />
              </div>
            )}
            <p className="font-semibold text-sm mb-0.5">{listing.model?.name}</p>
            <p className="text-xs text-[var(--muted)] mb-3">by {listing.maker?.display_name}</p>

            {selectedColor && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded border border-[var(--border)]">
                <span className="w-5 h-5 rounded-full border border-black/10 flex-shrink-0 block"
                  style={{ background: COLOR_HEX[selectedColor] ?? '#ccc' }} />
                <span className="text-xs font-medium">{selectedColor}</span>
              </div>
            )}

            <div className="space-y-2 text-sm border-t border-[var(--border)] pt-4">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Print</span>
                <span>{formatPrice(listing.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Delivery</span>
                <span>{formatPrice(DELIVERY_FEE)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-[var(--border)] pt-2 mt-2">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-4 text-xs">
              {colorStockCount > 0 ? (
                <>
                  <Package size={12} className="text-emerald-600" />
                  <span className="text-emerald-600 font-medium">In stock · Ships in 1-2 days</span>
                </>
              ) : (
                <>
                  <Clock size={12} className="text-[var(--muted)]" />
                  <span className="text-[var(--muted)]">
                    Print on demand · ~{Math.ceil((listing.print_time_hours ?? 24) / 24) + 2} days
                  </span>
                </>
              )}
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-2 leading-relaxed">
              Includes 12% platform fee. Payment instructions sent after maker confirms.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
