'use client'

import { useState, useEffect } from 'react'
import type { MapMaker } from './MakersMap'

interface Props {
  makers: MapMaker[]
  locale: string
}

export default function MakersMapWrapper({ makers, locale }: Props) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<Props> | null>(null)

  useEffect(() => {
    import('./MakersMap').then(mod => setMapComponent(() => mod.default))
  }, [])

  if (!MapComponent) {
    return (
      <div
        className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--accent-light)] animate-pulse"
        style={{ height: 400 }}
      />
    )
  }

  return <MapComponent makers={makers} locale={locale} />
}
