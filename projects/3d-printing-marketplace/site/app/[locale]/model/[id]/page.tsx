import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Star, Clock, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

function getDeliveryLabel(listing: any): string {
  if ((listing.stock_count ?? 0) > 0) return 'Ships in 1-2 days'
  const days = Math.ceil((listing.print_time_hours ?? 24) / 24) + 2
  return `~${days} days`
}

const COLOR_MAP: Record<string, string> = {
  White: '#FFFFFF', Black: '#1A1A1A', Gray: '#888888', Silver: '#C0C0C0',
  Red: '#E53E3E', Orange: '#ED8936', Yellow: '#ECC94B', Green: '#38A169',
  Teal: '#319795', Blue: '#3182CE', Purple: '#805AD5', Pink: '#ED64A6',
  Brown: '#8B5E3C', Beige: '#F5E6C8', Gold: '#D4AF37', Transparent: '#E8F4FD',
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const t = await getTranslations()
  const supabase = await createClient()

  const { data: model } = await supabase.from('models').select('*').eq('id', id).single()
  if (!model) notFound()

  // Get maker listings with profile
  const { data: listings } = await supabase
    .from('maker_listings')
    .select(`*, maker:profiles(id, display_name, location_city, avatar_url)`)
    .eq('model_id', id)
    .eq('is_active', true)
    .order('price', { ascending: true })

  // Fetch reviews for all makers in these listings
  const makerIds = listings?.map((l: any) => l.maker_id) ?? []
  const { data: reviews } = makerIds.length
    ? await supabase
        .from('reviews')
        .select('reviewee_id, quality_rating, delivery_rating')
        .in('reviewee_id', makerIds)
    : { data: [] }

  // Aggregate ratings per maker
  const ratingMap: Record<string, { sum: number; count: number }> = {}
  reviews?.forEach((r: any) => {
    const avg = (r.quality_rating + r.delivery_rating) / 2
    if (!ratingMap[r.reviewee_id]) ratingMap[r.reviewee_id] = { sum: 0, count: 0 }
    ratingMap[r.reviewee_id].sum += avg
    ratingMap[r.reviewee_id].count++
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href={`/${locale}/catalog`} className="text-sm text-[var(--muted)] hover:text-[var(--fg)] mb-6 inline-flex items-center gap-1">
        ← {t('common.back')}
      </Link>

      <div className="grid md:grid-cols-2 gap-10 mt-4">
        {/* Left — model info */}
        <div>
          <div className="aspect-[4/3] rounded-[var(--radius)] overflow-hidden bg-[var(--accent-light)] relative mb-6">
            {model.thumbnail ? (
              <Image src={model.thumbnail} alt={model.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)]">No image</div>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{model.name}</h1>
          {model.creator_username && (
            <p className="text-[var(--muted)] text-sm mb-3">
              {t('model.by')}{' '}
              <a href={model.creator_url} target="_blank" rel="noopener noreferrer"
                className="text-[var(--fg)] hover:text-[var(--accent)] inline-flex items-center gap-1">
                {model.creator_username} <ExternalLink size={12} />
              </a>
            </p>
          )}
          {model.summary && <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">{model.summary}</p>}
          <div className="flex flex-wrap gap-3 text-xs">
            {model.license_name && (
              <span className="px-2 py-1 bg-[var(--accent-light)] text-[var(--accent)] rounded font-medium">
                {model.license_name.replace('Creative Commons — ', 'CC ')}
              </span>
            )}
            {model.category_name && (
              <span className="px-2 py-1 bg-[var(--border)] rounded font-medium">{model.category_name}</span>
            )}
          </div>
        </div>

        {/* Right — makers */}
        <div>
          <h2 className="font-semibold text-lg mb-4">{t('model.makers')}</h2>
          {!listings || listings.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">{t('model.noMakers')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map((listing: any, i: number) => {
                const makerRating = ratingMap[listing.maker_id]
                const avg = makerRating ? makerRating.sum / makerRating.count : 0
                const reviewCount = makerRating?.count ?? 0

                return (
                  <div key={listing.id}
                    className={`border rounded-[var(--radius)] p-4 ${i === 0 ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)] bg-white'}`}>
                    {i === 0 && (
                      <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mb-2 block">Best price</span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/${locale}/maker/${listing.maker.id}`}
                          className="font-semibold text-sm hover:text-[var(--accent)]">
                          {listing.maker.display_name}
                        </Link>
                        {listing.maker.location_city && (
                          <p className="text-xs text-[var(--muted)] mt-0.5">{listing.maker.location_city}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                          {reviewCount > 0 && (
                            <span className="flex items-center gap-1 text-[var(--muted)]">
                              <Star size={11} className="fill-[var(--accent)] text-[var(--accent)]" />
                              {avg.toFixed(1)} ({reviewCount})
                            </span>
                          )}
                          {(listing.stock_count ?? 0) > 0 ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <Package size={11} /> In stock ({listing.stock_count})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[var(--muted)]">
                              <Clock size={11} /> Print on demand
                            </span>
                          )}
                          <span className="text-[var(--muted)]">{getDeliveryLabel(listing)}</span>
                        </div>
                        {listing.colors?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {listing.colors.map((c: string) => COLOR_MAP[c] ? (
                              <span key={c} title={c}
                                className="w-4 h-4 rounded-full border border-black/10 inline-block"
                                style={{ background: COLOR_MAP[c] }} />
                            ) : null)}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold">{formatPrice(listing.price)}</p>
                        <Link href={`/${locale}/order/new?listing=${listing.id}`}
                          className="mt-2 inline-block bg-[var(--fg)] text-white text-xs font-medium px-4 py-2 rounded hover:bg-[var(--accent)] transition-colors">
                          {t('model.orderWith')}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
