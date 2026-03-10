import { Star } from 'lucide-react'

export default function RatingStars({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className={i <= Math.round(rating) ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--border)]'} />
      ))}
      <span className="text-sm font-medium ml-1">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-[var(--muted)]">({count})</span>}
    </div>
  )
}
