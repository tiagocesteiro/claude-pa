'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Plus, Minus, Check, Printer, Package, X, Search, Pencil, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

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

const FILAMENT_COLORS = [
  { name: 'White',       hex: '#FFFFFF' },
  { name: 'Black',       hex: '#1A1A1A' },
  { name: 'Gray',        hex: '#888888' },
  { name: 'Silver',      hex: '#C0C0C0' },
  { name: 'Red',         hex: '#E53E3E' },
  { name: 'Orange',      hex: '#ED8936' },
  { name: 'Yellow',      hex: '#ECC94B' },
  { name: 'Green',       hex: '#38A169' },
  { name: 'Teal',        hex: '#319795' },
  { name: 'Blue',        hex: '#3182CE' },
  { name: 'Purple',      hex: '#805AD5' },
  { name: 'Pink',        hex: '#ED64A6' },
  { name: 'Brown',       hex: '#8B5E3C' },
  { name: 'Beige',       hex: '#F5E6C8' },
  { name: 'Gold',        hex: '#D4AF37' },
  { name: 'Transparent', hex: '#E8F4FD' },
]

const COLOR_HEX: Record<string, string> = Object.fromEntries(FILAMENT_COLORS.map(c => [c.name, c.hex]))

function totalStock(colorStock: Record<string, number>): number {
  return Object.values(colorStock).reduce((s, v) => s + (v > 0 ? v : 0), 0)
}

function getDeliveryLabel(colorStock: Record<string, number>, printHours: number): string {
  if (totalStock(colorStock) > 0) return '1-2 days'
  const days = Math.ceil((printHours ?? 24) / 24) + 2
  return `~${days} days`
}

export default function ListingsPage() {
  const [user, setUser] = useState<any>(null)
  const [myListings, setMyListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Catalog browser
  const [addMode, setAddMode] = useState(false)
  const [catalogModels, setCatalogModels] = useState<any[]>([])
  const [catalogQ, setCatalogQ] = useState('')
  const [catalogCatIds, setCatalogCatIds] = useState<string[]>([])

  // Step 1 — Print instructions
  const [instructionsModel, setInstructionsModel] = useState<any | null>(null)
  const [printSettings, setPrintSettings] = useState<any | null>(null)
  const [printSettingsLoading, setPrintSettingsLoading] = useState(false)
  const [instructionsAccepted, setInstructionsAccepted] = useState(false)

  // Step 2 — Configure form
  const [configuring, setConfiguring] = useState<{ modelId: string; listingId?: string; model?: any } | null>(null)
  const [priceInput, setPriceInput] = useState('15')
  const [printHoursInput, setPrintHoursInput] = useState('24')
  // color_stock: {ColorName: stockCount}
  const [colorStock, setColorStock] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Stock update
  const [updatingStock, setUpdatingStock] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from('maker_listings')
          .select('*, model:models(*)')
          .eq('maker_id', data.user.id)
          .order('created_at', { ascending: false })
          .then(({ data: l }) => { setMyListings(l ?? []); setLoading(false) })
      } else {
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!addMode) return
    const supabase = createClient()
    const listed = new Set(myListings.map(l => l.model_id))
    let query = supabase.from('models').select('*').eq('is_active', true).order('likes', { ascending: false }).limit(60)
    if (catalogQ) query = (query as any).ilike('name', `%${catalogQ}%`)
    if (catalogCatIds.length === 1) query = (query as any).eq('category_id', catalogCatIds[0])
    else if (catalogCatIds.length > 1) query = (query as any).in('category_id', catalogCatIds)
    query.then(({ data }) => setCatalogModels((data ?? []).filter(m => !listed.has(m.id))))
  }, [addMode, catalogQ, catalogCatIds, myListings])

  // Open instructions step for a new listing
  const openInstructions = async (model: any) => {
    setAddMode(false)
    setInstructionsModel(model)
    setInstructionsAccepted(false)
    setPrintSettings(null)
    setPrintSettingsLoading(true)
    try {
      const res = await fetch(`/api/models/${model.id}/print-settings`)
      const data = await res.json()
      setPrintSettings(data)
    } catch {
      setPrintSettings({ source: 'default', notes: 'Could not load print settings.', modelUrl: model.url })
    }
    setPrintSettingsLoading(false)
  }

  // Proceed from instructions to configure form
  const proceedToConfigure = () => {
    setConfiguring({ modelId: instructionsModel.id, model: instructionsModel })
    setPriceInput('15')
    setPrintHoursInput('24')
    setColorStock({})
    setSaveError('')
    setInstructionsModel(null)
  }

  // Open configure for editing an existing listing
  const openEdit = (listing: any) => {
    setConfiguring({ modelId: listing.model_id, listingId: listing.id, model: listing.model })
    setPriceInput(String(listing.price))
    setPrintHoursInput(String(listing.print_time_hours ?? 24))
    setColorStock(listing.color_stock ?? {})
    setSaveError('')
  }

  const toggleColor = (colorName: string) => {
    setColorStock(prev => {
      if (colorName in prev) {
        const next = { ...prev }
        delete next[colorName]
        return next
      }
      return { ...prev, [colorName]: 0 }
    })
  }

  const setColorCount = (colorName: string, delta: number) => {
    setColorStock(prev => ({ ...prev, [colorName]: Math.max(0, (prev[colorName] ?? 0) + delta) }))
  }

  const saveListing = async () => {
    if (!user || !configuring) return
    const supabase = createClient()
    const price = parseFloat(priceInput)
    if (isNaN(price) || price <= 0) return
    setSaving(true)
    setSaveError('')

    const fullPayload = {
      price,
      print_time_days: Math.ceil(parseInt(printHoursInput) / 24) + 2,
      print_time_hours: parseInt(printHoursInput),
      colors: Object.keys(colorStock),
      color_stock: colorStock,
      stock_count: totalStock(colorStock),
    }

    // Fallback payload without color_stock (if migration 009 hasn't been run)
    const legacyPayload = {
      price: fullPayload.price,
      print_time_days: fullPayload.print_time_days,
      print_time_hours: fullPayload.print_time_hours,
      colors: fullPayload.colors,
      stock_count: fullPayload.stock_count,
    }

    const tryInsertOrUpdate = async (payload: typeof fullPayload | typeof legacyPayload) => {
      if (configuring.listingId) {
        return supabase
          .from('maker_listings')
          .update(payload)
          .eq('id', configuring.listingId)
          .select('*, model:models(*)')
          .single()
      } else {
        return supabase
          .from('maker_listings')
          .insert({ maker_id: user.id, model_id: configuring.modelId, is_active: true, ...payload })
          .select('*, model:models(*)')
          .single()
      }
    }

    let { data, error } = await tryInsertOrUpdate(fullPayload)

    // If color_stock column doesn't exist (migration 009 not run), retry without it
    if (error && error.message?.includes('color_stock')) {
      ;({ data, error } = await tryInsertOrUpdate(legacyPayload))
    }

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    if (data) {
      if (configuring.listingId) {
        setMyListings(l => l.map(item => item.id === configuring.listingId ? data : item))
      } else {
        setMyListings(l => [data, ...l])
      }
    }

    setSaving(false)
    setConfiguring(null)
  }

  const removeListing = async (listingId: string) => {
    const supabase = createClient()
    await supabase.from('maker_listings').delete().eq('id', listingId)
    setMyListings(l => l.filter(item => item.id !== listingId))
  }

  const updateColorStock = async (listingId: string, colorName: string, delta: number) => {
    const listing = myListings.find(l => l.id === listingId)
    if (!listing) return
    const current: Record<string, number> = listing.color_stock ?? {}
    const newCount = Math.max(0, (current[colorName] ?? 0) + delta)
    const newColorStock = { ...current, [colorName]: newCount }
    const newTotal = totalStock(newColorStock)
    setUpdatingStock(`${listingId}-${colorName}`)
    const supabase = createClient()
    await supabase.from('maker_listings').update({ color_stock: newColorStock, stock_count: newTotal }).eq('id', listingId)
    setMyListings(l => l.map(item => item.id === listingId
      ? { ...item, color_stock: newColorStock, stock_count: newTotal }
      : item
    ))
    setUpdatingStock(null)
  }

  if (loading) return <div className="text-sm text-[var(--muted)]">Loading...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Listings</h1>
        {!instructionsModel && !configuring && (
          <button
            onClick={() => { setAddMode(true) }}
            className="flex items-center gap-1.5 bg-[var(--fg)] text-white text-sm font-medium px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors">
            <Plus size={14} /> Add listing
          </button>
        )}
      </div>

      {/* ── Step 1: Print instructions ───────────────────────────────────────── */}
      {instructionsModel && (
        <div className="border border-amber-200 bg-amber-50 rounded-[var(--radius)] p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Print requirements — {instructionsModel.name}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Review before listing. You are responsible for printing this model correctly.
                </p>
              </div>
            </div>
            <button onClick={() => setInstructionsModel(null)} className="text-[var(--muted)] hover:text-[var(--fg)] ml-3">
              <X size={16} />
            </button>
          </div>

          {printSettingsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-[var(--muted)]">
              <Loader2 size={14} className="animate-spin" /> Loading print settings from Printables...
            </div>
          ) : printSettings ? (
            <div className="bg-white border border-amber-100 rounded-[var(--radius)] p-4 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Material</p>
                  <p className="font-semibold text-sm">{printSettings.material ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Infill</p>
                  <p className="font-semibold text-sm">{printSettings.infill != null ? `${printSettings.infill}%` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Layer height</p>
                  <p className="font-semibold text-sm">{printSettings.layerHeight != null ? `${printSettings.layerHeight}mm` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Supports</p>
                  <p className={`font-semibold text-sm ${printSettings.supportsNeeded ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {printSettings.supportsNeeded == null ? '—' : printSettings.supportsNeeded ? 'Required' : 'Not needed'}
                  </p>
                </div>
              </div>

              {printSettings.source === 'default' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                  These are default recommendations for this category. Always verify on the original model page.
                </p>
              )}
              {printSettings.notes && printSettings.source !== 'default' && (
                <p className="text-xs text-[var(--muted)] mb-3">{printSettings.notes}</p>
              )}

              {printSettings.modelUrl && (
                <a href={printSettings.modelUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline">
                  <ExternalLink size={11} /> View original model on Printables
                </a>
              )}
            </div>
          ) : null}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={instructionsAccepted}
              onChange={e => setInstructionsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--fg)] flex-shrink-0"
            />
            <span className="text-sm">
              I confirm that I have read and understood the print requirements for this model and I am able to print it correctly.
            </span>
          </label>

          <div className="flex gap-2 mt-4">
            <button
              onClick={proceedToConfigure}
              disabled={!instructionsAccepted}
              className="flex items-center gap-1.5 bg-[var(--fg)] text-white text-sm font-medium px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Check size={14} /> Continue to setup
            </button>
            <button onClick={() => setInstructionsModel(null)}
              className="text-sm text-[var(--muted)] hover:text-[var(--fg)] px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Configure form ────────────────────────────────────────────── */}
      {configuring && (
        <div className="border border-[var(--fg)] rounded-[var(--radius)] p-5 bg-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-sm">{configuring.listingId ? 'Edit listing' : 'New listing'}</p>
              {configuring.model && <p className="text-xs text-[var(--muted)]">{configuring.model.name}</p>}
            </div>
            <button onClick={() => setConfiguring(null)} className="text-[var(--muted)] hover:text-[var(--fg)]">
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-3 mb-5 flex-wrap">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Price (€)</label>
              <input value={priceInput} onChange={e => setPriceInput(e.target.value)}
                placeholder="15.00" className="w-24 border border-[var(--border)] rounded-[var(--radius)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Print time (hours)</label>
              <input value={printHoursInput} onChange={e => setPrintHoursInput(e.target.value)}
                placeholder="24" className="w-24 border border-[var(--border)] rounded-[var(--radius)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
          </div>

          {/* Colors + per-color stock */}
          <div className="mb-5">
            <label className="text-xs text-[var(--muted)] block mb-2">
              Available colors & stock
              {Object.keys(colorStock).length > 0 && (
                <span className="text-[var(--fg)] font-medium ml-1">({Object.keys(colorStock).length} selected)</span>
              )}
            </label>

            {/* Color picker */}
            <div className="flex flex-wrap gap-2 mb-3">
              {FILAMENT_COLORS.map(color => {
                const isSelected = color.name in colorStock
                return (
                  <button key={color.name} onClick={() => toggleColor(color.name)}
                    title={color.name}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${isSelected ? 'border-[var(--fg)] scale-110' : 'border-transparent hover:border-[var(--muted)]'}`}
                    style={{ background: color.hex, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
                  />
                )
              })}
            </div>

            {/* Per-color stock counters */}
            {Object.keys(colorStock).length > 0 && (
              <div className="space-y-2 bg-gray-50 rounded-[var(--radius)] p-3">
                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">Units in stock per color (0 = print on demand)</p>
                {Object.entries(colorStock).map(([colorName, count]) => (
                  <div key={colorName} className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                      style={{ background: COLOR_HEX[colorName] ?? '#ccc' }} />
                    <span className="text-xs w-20 text-[var(--fg)]">{colorName}</span>
                    <div className="flex items-center gap-1 border border-[var(--border)] rounded bg-white px-1">
                      <button onClick={() => setColorCount(colorName, -1)}
                        disabled={count === 0}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--border)] disabled:opacity-30 transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="w-7 text-center text-xs font-medium tabular-nums">{count}</span>
                      <button onClick={() => setColorCount(colorName, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--border)] transition-colors">
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className={`text-[10px] font-medium ${count > 0 ? 'text-emerald-600' : 'text-[var(--muted)]'}`}>
                      {count > 0 ? `${count} in stock` : 'On demand'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery summary */}
          {totalStock(colorStock) > 0 ? (
            <p className="text-xs text-emerald-600 mb-4 flex items-center gap-1">
              <Package size={12} /> {totalStock(colorStock)} units total in stock · ships in 1-2 days
            </p>
          ) : (
            <p className="text-xs text-[var(--muted)] mb-4">
              On demand · ~{Math.ceil(parseInt(printHoursInput || '24') / 24) + 2} days estimated delivery
            </p>
          )}

          {saveError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
              Error: {saveError}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={saveListing} disabled={saving}
              className="flex items-center gap-1.5 bg-[var(--fg)] text-white text-xs font-medium px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors disabled:opacity-60">
              <Check size={12} /> {saving ? 'Saving...' : (configuring.listingId ? 'Save changes' : 'Add listing')}
            </button>
            <button onClick={() => setConfiguring(null)}
              className="text-xs text-[var(--muted)] hover:text-[var(--fg)] px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Catalog browser (add mode) ────────────────────────────────────────── */}
      {addMode && (
        <div className="border border-[var(--border)] rounded-[var(--radius)] bg-white mb-6">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border)]">
            <p className="font-semibold text-sm">Browse catalog</p>
            <button onClick={() => setAddMode(false)} className="text-[var(--muted)] hover:text-[var(--fg)]">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 border-b border-[var(--border)]">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input value={catalogQ} onChange={e => setCatalogQ(e.target.value)}
                placeholder="Search models..."
                className="w-full pl-9 pr-3 py-2 border border-[var(--border)] rounded-[var(--radius)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(c => {
                const isActive = c.ids.join(',') === catalogCatIds.join(',')
                return (
                  <button key={c.name} onClick={() => setCatalogCatIds(c.ids)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${isActive ? 'bg-[var(--fg)] text-white border-[var(--fg)]' : 'border-[var(--border)] hover:border-[var(--fg)] bg-white'}`}>
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {catalogModels.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-8">No models found</p>
            ) : (
              catalogModels.map(model => (
                <div key={model.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[var(--accent-light)] relative">
                    {model.thumbnail
                      ? <Image src={model.thumbnail} alt={model.name} fill className="object-cover" unoptimized />
                      : <div className="absolute inset-0 flex items-center justify-center"><Printer size={14} className="text-[var(--accent)] opacity-40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{model.name}</p>
                    <p className="text-xs text-[var(--muted)]">{model.category_name}</p>
                  </div>
                  <button onClick={() => openInstructions(model)}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--fg)] border border-[var(--fg)] rounded-[var(--radius)] px-3 py-1.5 hover:bg-[var(--fg)] hover:text-white transition-colors flex-shrink-0">
                    <Plus size={12} /> List
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── My listings ───────────────────────────────────────────────────────── */}
      {myListings.length === 0 && !addMode && !configuring && !instructionsModel ? (
        <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-[var(--radius)]">
          <Printer size={32} className="mx-auto text-[var(--muted)] opacity-30 mb-3" />
          <p className="text-sm text-[var(--muted)] mb-4">No listings yet. Add models you can print.</p>
          <button onClick={() => setAddMode(true)}
            className="flex items-center gap-1.5 bg-[var(--fg)] text-white text-sm font-medium px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors mx-auto">
            <Plus size={14} /> Add your first listing
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myListings.map(listing => {
            const model = listing.model
            const cs: Record<string, number> = listing.color_stock ?? {}
            const colors = Object.keys(cs)
            const total = totalStock(cs)

            return (
              <div key={listing.id} className="border border-[var(--border)] rounded-[var(--radius)] p-4 bg-white">
                <div className="flex gap-4 items-start">
                  <div className="w-14 h-14 rounded flex-shrink-0 overflow-hidden bg-[var(--accent-light)] relative mt-0.5">
                    {model?.thumbnail
                      ? <Image src={model.thumbnail} alt={model.name} fill className="object-cover" unoptimized />
                      : <div className="absolute inset-0 flex items-center justify-center"><Printer size={18} className="text-[var(--accent)] opacity-40" /></div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{model?.name}</p>
                    <p className="text-xs text-[var(--muted)] mb-1.5">{model?.category_name}</p>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-xs font-medium text-[var(--accent)]">{formatPrice(listing.price)}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {total > 0 ? `${total} in stock` : 'On demand'}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {getDeliveryLabel(cs, listing.print_time_hours ?? 24)}
                      </span>
                    </div>

                    {/* Per-color stock display */}
                    {colors.length > 0 && (
                      <div className="space-y-1.5">
                        {colors.map(colorName => {
                          const count = cs[colorName] ?? 0
                          const key = `${listing.id}-${colorName}`
                          const isUpdating = updatingStock === key
                          return (
                            <div key={colorName} className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                                style={{ background: COLOR_HEX[colorName] ?? '#ccc' }} />
                              <span className="text-[11px] text-[var(--muted)] w-16">{colorName}</span>
                              <div className="flex items-center gap-0.5 border border-[var(--border)] rounded px-0.5">
                                <button onClick={() => updateColorStock(listing.id, colorName, -1)}
                                  disabled={count === 0 || isUpdating}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--border)] disabled:opacity-30 transition-colors">
                                  <Minus size={9} />
                                </button>
                                <span className="w-6 text-center text-[11px] font-medium tabular-nums">{count}</span>
                                <button onClick={() => updateColorStock(listing.id, colorName, 1)}
                                  disabled={isUpdating}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--border)] transition-colors">
                                  <Plus size={9} />
                                </button>
                              </div>
                              <span className={`text-[10px] ${count > 0 ? 'text-emerald-600 font-medium' : 'text-[var(--muted)]'}`}>
                                {count > 0 ? 'in stock' : 'on demand'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(listing)}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] hover:border-[var(--fg)] transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => removeListing(listing.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
