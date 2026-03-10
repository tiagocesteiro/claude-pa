import Image from 'next/image'
import Link from 'next/link'
import { Heart, Printer } from 'lucide-react'

interface ModelCardProps {
  model: {
    id: string
    name: string
    summary?: string
    thumbnail?: string
    license_name?: string
    creator_username?: string
    likes?: number
    makes?: number
    category_name?: string
  }
  locale: string
}

export default function ModelCard({ model, locale }: ModelCardProps) {
  return (
    <Link href={`/${locale}/model/${model.id}`}
      className="group bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden hover:border-[var(--fg)] hover:shadow-md transition-all">
      <div className="aspect-[4/3] bg-[var(--accent-light)] relative overflow-hidden">
        {model.thumbnail ? (
          <Image src={model.thumbnail} alt={model.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Printer size={32} className="text-[var(--accent)] opacity-40" />
          </div>
        )}
        {model.license_name && (
          <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur">
            {model.license_name.replace('Creative Commons — ', 'CC ').replace(' Public Domain', '0')}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1">{model.name}</p>
        {model.creator_username && (
          <p className="text-[var(--muted)] text-xs mb-2">by {model.creator_username}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1"><Heart size={11} />{model.likes?.toLocaleString()}</span>
          <span className="flex items-center gap-1"><Printer size={11} />{model.makes?.toLocaleString()}</span>
          {model.category_name && <span className="ml-auto truncate">{model.category_name}</span>}
        </div>
      </div>
    </Link>
  )
}
