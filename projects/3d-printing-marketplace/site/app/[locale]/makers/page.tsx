import { createClient } from '@/lib/supabase/server'
import MakersList from '@/components/makers/MakersList'
import type { MakerItem } from '@/components/makers/MakersList'

export default async function MakersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: makers } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['maker', 'both'])
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const makerIds = makers?.map(m => m.id) ?? []
  const [{ data: listingCounts }, { data: reviews }] = await Promise.all([
    makerIds.length
      ? supabase.from('maker_listings').select('maker_id').eq('is_active', true).in('maker_id', makerIds)
      : Promise.resolve({ data: [] }),
    makerIds.length
      ? supabase.from('reviews').select('reviewee_id, quality_rating, delivery_rating').in('reviewee_id', makerIds)
      : Promise.resolve({ data: [] }),
  ])

  const countMap: Record<string, number> = {}
  listingCounts?.forEach(l => { countMap[l.maker_id] = (countMap[l.maker_id] ?? 0) + 1 })

  const reviewMap: Record<string, { sum: number; count: number }> = {}
  reviews?.forEach(r => {
    const avg = (r.quality_rating + r.delivery_rating) / 2
    if (!reviewMap[r.reviewee_id]) reviewMap[r.reviewee_id] = { sum: 0, count: 0 }
    reviewMap[r.reviewee_id].sum += avg
    reviewMap[r.reviewee_id].count++
  })

  const makerItems: MakerItem[] = (makers ?? []).map(m => ({
    id: m.id,
    display_name: m.display_name,
    location_city: m.location_city ?? null,
    location_lat: m.location_lat ?? null,
    location_lng: m.location_lng ?? null,
    avg_rating: reviewMap[m.id] ? reviewMap[m.id].sum / reviewMap[m.id].count : null,
    listing_count: countMap[m.id] ?? 0,
    review_count: reviewMap[m.id]?.count ?? 0,
    bio: m.bio ?? null,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Makers</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Local makers ready to print your order.</p>
      <MakersList makers={makerItems} locale={locale} />
    </div>
  )
}
