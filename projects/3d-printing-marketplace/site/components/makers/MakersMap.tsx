'use client'

import { useEffect, useRef } from 'react'

export interface MapMaker {
  id: string
  display_name: string
  location_city: string | null
  location_lat: number
  location_lng: number
  avg_rating: number | null
  listing_count: number
}

interface Props {
  makers: MapMaker[]
  locale: string
}

export default function MakersMap({ makers, locale }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let mounted = true

    // Defer to next frame to ensure container is rendered
    const timeoutId = setTimeout(async () => {
      if (!mounted || !containerRef.current) return

      try {
        const L = await import('leaflet')

        if (!mounted || !containerRef.current) return

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        const map = L.map(containerRef.current, {
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView([39.5, -8.0], 6)
        mapRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map)

        // Custom coral marker
        const accentIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;
            background:#059669;
            border:3px solid white;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        })

        makers.forEach(maker => {
          const stars = maker.avg_rating ? `⭐ ${maker.avg_rating.toFixed(1)}` : 'No reviews yet'
          const popup = `
            <div style="font-family:'DM Sans',sans-serif;min-width:160px">
              <p style="font-weight:700;font-size:14px;margin:0 0 2px">${maker.display_name}</p>
              ${maker.location_city ? `<p style="color:#6B6B6B;font-size:12px;margin:0 0 6px">📍 ${maker.location_city}</p>` : ''}
              <p style="font-size:12px;color:#6B6B6B;margin:0 0 8px">${stars} · ${maker.listing_count} models</p>
              <a href="/${locale}/maker/${maker.id}"
                style="display:inline-block;background:#059669;color:white;font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;text-decoration:none">
                View profile
              </a>
            </div>
          `
          L.marker([maker.location_lat, maker.location_lng], { icon: accentIcon })
            .addTo(map)
            .bindPopup(popup)
        })

        // Fit map to markers if we have any
        if (makers.length > 0) {
          const bounds = L.latLngBounds(makers.map(m => [m.location_lat, m.location_lng]))
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10, animate: false })
        }
      } catch (err) {
        console.error('Map initialization error:', err)
      }
    }, 0)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [makers, locale])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-[var(--radius)] overflow-hidden border border-[var(--border)]"
      style={{ height: 400 }}
    />
  )
}
