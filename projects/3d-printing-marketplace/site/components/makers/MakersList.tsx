'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Star, Package, SlidersHorizontal, LocateFixed, Loader2 } from 'lucide-react'

export interface MakerItem {
  id: string
  display_name: string
  location_city: string | null
  location_lat: number | null
  location_lng: number | null
  avg_rating: number | null
  listing_count: number
  review_count: number
  bio: string | null
}

type SortOption = 'rating' | 'models' | 'name' | 'distance'

interface Props {
  makers: MakerItem[]
  locale: string
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function MakersList({ makers, locale }: Props) {
  const [sortBy, setSortBy] = useState<SortOption>('rating')
  const [minRating, setMinRating] = useState(0)
  const [locationOnly, setLocationOnly] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setSortBy('distance')
        setLocating(false)
      },
      () => {
        setLocError('Could not get your location')
        setLocating(false)
      }
    )
  }

  const filtered = useMemo(() => {
    let list = [...makers]

    if (locationOnly) list = list.filter(m => m.location_city)
    if (minRating > 0) list = list.filter(m => m.avg_rating !== null && m.avg_rating >= minRating)

    list.sort((a, b) => {
      if (sortBy === 'distance' && userCoords) {
        const dA =
          a.location_lat && a.location_lng
            ? haversine(userCoords.lat, userCoords.lng, a.location_lat, a.location_lng)
            : Infinity
        const dB =
          b.location_lat && b.location_lng
            ? haversine(userCoords.lat, userCoords.lng, b.location_lat, b.location_lng)
            : Infinity
        return dA - dB
      }
      if (sortBy === 'rating') return (b.avg_rating ?? -1) - (a.avg_rating ?? -1)
      if (sortBy === 'models') return b.listing_count - a.listing_count
      if (sortBy === 'name') return a.display_name.localeCompare(b.display_name)
      return 0
    })

    return list
  }, [makers, sortBy, minRating, locationOnly, userCoords])

  function distLabel(maker: MakerItem): string | null {
    if (!userCoords || !maker.location_lat || !maker.location_lng) return null
    const km = haversine(userCoords.lat, userCoords.lng, maker.location_lat, maker.location_lng)
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(0)} km`
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white border border-[var(--border)] rounded-[var(--radius)]">
        <SlidersHorizontal size={15} className="text-[var(--muted)] flex-shrink-0" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted)] whitespace-nowrap">Sort by</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="text-sm border border-[var(--border)] rounded-md px-2 py-1 bg-white focus:outline-none focus:border-[var(--fg)]"
          >
            <option value="rating">Top rated</option>
            <option value="models">Most models</option>
            <option value="name">Name (A–Z)</option>
            {userCoords && <option value="distance">Nearest first</option>}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted)] whitespace-nowrap">Min rating</label>
          <select
            value={minRating}
            onChange={e => setMinRating(Number(e.target.value))}
            className="text-sm border border-[var(--border)] rounded-md px-2 py-1 bg-white focus:outline-none focus:border-[var(--fg)]"
          >
            <option value={0}>Any</option>
            <option value={3}>3+</option>
            <option value={4}>4+</option>
            <option value={4.5}>4.5+</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={locationOnly}
            onChange={e => setLocationOnly(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span className="text-xs text-[var(--muted)]">With location</span>
        </label>

        <button
          onClick={requestLocation}
          disabled={locating}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--fg)] transition-colors disabled:opacity-50"
        >
          {locating
            ? <Loader2 size={13} className="animate-spin" />
            : <LocateFixed size={13} />}
          {userCoords ? 'Location active' : 'Use my location'}
        </button>
        {locError && <span className="text-xs text-red-500">{locError}</span>}
      </div>

      {/* Results count */}
      <p className="text-xs text-[var(--muted)] mb-4">
        {filtered.length} maker{filtered.length !== 1 ? 's' : ''}
        {minRating > 0 || locationOnly ? ' (filtered)' : ''}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-[var(--muted)] text-center py-16">No makers match the current filters.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(maker => {
            const dist = distLabel(maker)
            return (
              <Link
                key={maker.id}
                href={`/${locale}/maker/${maker.id}`}
                className="flex items-center gap-4 border border-[var(--border)] rounded-[var(--radius)] bg-white px-5 py-4 hover:border-[var(--fg)] hover:shadow-sm transition-all"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-[var(--accent)] text-lg">
                    {maker.display_name[0]}
                  </span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{maker.display_name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {maker.location_city && (
                      <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <MapPin size={10} />
                        {maker.location_city}
                        {dist && <span className="text-[var(--accent)] font-medium ml-1">· {dist}</span>}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Package size={10} />
                      {maker.listing_count} model{maker.listing_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {maker.bio && (
                    <p className="text-xs text-[var(--muted)] mt-1.5 line-clamp-1">{maker.bio}</p>
                  )}
                </div>

                {/* Rating */}
                {maker.avg_rating !== null ? (
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Star size={13} className="fill-[var(--accent)] text-[var(--accent)]" />
                      <span className="font-semibold text-sm">{maker.avg_rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {maker.review_count} review{maker.review_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : (
                  <span className="flex-shrink-0 text-xs text-[var(--muted)]">No reviews</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
