import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { formatPrice, ratingAverage } from '@/lib/utils'
import RatingStars from '@/components/maker/RatingStars'
import ProfileHeader from '@/components/maker/ProfileHeader'

export default async function MakerProfilePage({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { locale, handle } = await params
  const t = await getTranslations('maker')
  const supabase = await createClient()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', handle).single()
  if (!profile) notFound()

  const [{ data: listings }, { data: reviews }, { count: totalOrders }] = await Promise.all([
    supabase.from('maker_listings')
      .select('*, model:models(*)')
      .eq('maker_id', handle)
      .eq('is_active', true)
      .order('price', { ascending: true }),
    supabase.from('reviews')
      .select('*, reviewer:profiles!reviewer_id(display_name)')
      .eq('reviewee_id', handle)
      .order('created_at', { ascending: false }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('maker_id', handle).eq('status', 'delivered'),
  ])

  const avgQ = reviews?.length ? reviews.reduce((s, r) => s + r.quality_rating, 0) / reviews.length : 0
  const avgD = reviews?.length ? reviews.reduce((s, r) => s + r.delivery_rating, 0) / reviews.length : 0
  const avg = reviews?.length ? ratingAverage(avgQ, avgD) : 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <ProfileHeader
        profile={profile}
        avgQ={avgQ}
        avgD={avgD}
        reviewCount={reviews?.length ?? 0}
        totalOrders={totalOrders}
      />

      {/* Listings */}
      <section className="mb-10">
        <h2 className="font-bold text-lg mb-4">{t('listings')}</h2>
        {!listings?.length ? (
          <p className="text-[var(--muted)] text-sm">{t('noListings')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {listings.map((listing: any) => (
              <Link key={listing.id} href={`/${locale}/order/new?listing=${listing.id}`}
                className="border border-[var(--border)] rounded-[var(--radius)] overflow-hidden bg-white hover:border-[var(--fg)] hover:shadow-sm transition-all">
                <div className="aspect-[4/3] bg-[var(--accent-light)] relative overflow-hidden">
                  {listing.model?.thumbnail && (
                    <Image src={listing.model.thumbnail} alt={listing.model.name} fill className="object-cover" unoptimized />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold line-clamp-2 mb-1">{listing.model?.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--accent)] font-bold text-sm">{formatPrice(listing.price)}</span>
                    <span className="text-xs text-[var(--muted)]">{listing.print_time_days}d</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section>
        <h2 className="font-bold text-lg mb-4">{t('reviews')} {reviews?.length ? `(${reviews.length})` : ''}</h2>
        {!reviews?.length ? (
          <p className="text-[var(--muted)] text-sm">{t('noReviews')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="border border-[var(--border)] rounded-[var(--radius)] p-4 bg-white">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-sm">{review.reviewer?.display_name}</p>
                  <p className="text-xs text-[var(--muted)]">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-6 mb-2 text-xs">
                  <div>
                    <p className="text-[var(--muted)] mb-0.5">Quality</p>
                    <RatingStars rating={review.quality_rating} />
                  </div>
                  <div>
                    <p className="text-[var(--muted)] mb-0.5">Delivery</p>
                    <RatingStars rating={review.delivery_rating} />
                  </div>
                </div>
                {review.comment && <p className="text-sm text-[var(--muted)] italic">&ldquo;{review.comment}&rdquo;</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
