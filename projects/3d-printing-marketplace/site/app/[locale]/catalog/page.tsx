import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import ModelCard from '@/components/catalog/ModelCard'
import { Search } from 'lucide-react'

// Each entry can contain multiple DB category_id values (comma-separated in URL)
const CATEGORIES = [
  { ids: [],                              name: 'All' },
  { ids: ['31','33','37','47','97'],       name: 'Toys & Games' },
  { ids: ['44'],                          name: 'Home Decor' },
  { ids: ['61'],                          name: 'Animals' },
  { ids: ['14','41'],                     name: 'Art & Sculptures' },
  { ids: ['77','78','81'],                name: 'Cosplay' },
  { ids: ['83','84','85'],                name: 'Sports' },
  { ids: ['25','27','29','43'],           name: 'Tech & Gadgets' },
  { ids: ['49','50','93'],                name: 'Tools & Organizers' },
  { ids: ['40','42'],                     name: 'Fashion' },
  { ids: ['4','5','15','45'],             name: 'Household' },
]

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; cat?: string }>
}) {
  const { locale } = await params
  const { q, cat } = await searchParams
  const t = await getTranslations('catalog')
  const supabase = await createClient()

  // cat is comma-separated list of category_ids
  const catIds = cat ? cat.split(',').filter(Boolean) : []

  let query = supabase.from('models').select('*').eq('is_active', true).order('likes', { ascending: false }).limit(60)
  if (q) query = query.ilike('name', `%${q}%`)
  if (catIds.length === 1) query = query.eq('category_id', catIds[0])
  else if (catIds.length > 1) query = query.in('category_id', catIds)

  const { data: models } = await query

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            name="q" defaultValue={q}
            placeholder={t('search')}
            className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-[var(--radius)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {cat && <input type="hidden" name="cat" value={cat} />}
        </form>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map(c => {
          const catParam = c.ids.join(',')
          const isActive = catParam === '' ? !cat : cat === catParam
          const params = new URLSearchParams({ ...(q ? { q } : {}), ...(catParam ? { cat: catParam } : {}) })
          return (
            <a key={c.name} href={`?${params}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-[var(--fg)] text-white border-[var(--fg)]'
                  : 'border-[var(--border)] hover:border-[var(--fg)] bg-white'
              }`}>
              {c.name}
            </a>
          )
        })}
      </div>

      {/* Grid */}
      {models && models.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {models.map(model => <ModelCard key={model.id} model={model} locale={locale} />)}
        </div>
      ) : (
        <p className="text-[var(--muted)] text-center py-20">{t('noResults')}</p>
      )}
    </div>
  )
}
