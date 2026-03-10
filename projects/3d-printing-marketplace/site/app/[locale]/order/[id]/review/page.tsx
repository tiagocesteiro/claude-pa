'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}>
          <Star size={24} className={i <= value ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--border)] hover:text-[var(--accent)]'} />
        </button>
      ))}
    </div>
  )
}

export default function ReviewPage({ params }: { params: any }) {
  const t = useTranslations('review')
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.split('/')[1]
  const orderId = pathname.split('/')[3]

  const [quality, setQuality] = useState(5)
  const [delivery, setDelivery] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: order } = await supabase.from('orders').select('maker_id').eq('id', orderId).single()
    if (!order) return
    await supabase.from('reviews').insert({
      order_id: orderId, reviewer_id: user.id, reviewee_id: order.maker_id,
      quality_rating: quality, delivery_rating: delivery, comment,
    })
    router.push(`/${locale}/order/${orderId}`)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div>
          <label className="text-sm font-medium block mb-2">{t('qualityLabel')}</label>
          <StarPicker value={quality} onChange={setQuality} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">{t('deliveryLabel')}</label>
          <StarPicker value={delivery} onChange={setDelivery} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">{t('commentLabel')}</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none" />
        </div>
        <button type="submit" disabled={loading}
          className="bg-[var(--fg)] text-white py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--accent)] transition-colors disabled:opacity-50">
          {loading ? '...' : t('submit')}
        </button>
      </form>
    </div>
  )
}
