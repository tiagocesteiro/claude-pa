import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PRINTABLES_GQL = 'https://api.printables.com/graphql/'

const QUERY = `
query GetPrint($id: ID!) {
  print(id: $id) {
    id
    summary
    stlFiles {
      name
      printSettings {
        material
        layerHeight
        infill
        supportsSettings { enabled }
        brimSkirt
      }
    }
  }
}
`

type PrintSettings = {
  material: string
  infill: number
  layerHeight: number
  supportsNeeded: boolean
  brimSkirt: boolean
  source: 'printables' | 'default'
  notes: string | null
}

function categoryDefaults(categoryName: string): PrintSettings {
  const c = (categoryName ?? '').toLowerCase()
  let material = 'PLA'
  let infill = 20
  let supportsNeeded = false

  if (c.includes('tool') || c.includes('sport') || c.includes('outdoor') || c.includes('functional')) {
    material = 'PETG'
    infill = 30
  } else if (c.includes('art') || c.includes('sculpt') || c.includes('decor')) {
    material = 'PLA'
    infill = 15
  } else if (c.includes('cosplay') || c.includes('costume')) {
    material = 'PLA'
    infill = 15
  } else if (c.includes('toy') || c.includes('game') || c.includes('puzzle')) {
    material = 'PLA'
    infill = 20
  }

  return {
    material,
    infill,
    layerHeight: 0.2,
    supportsNeeded,
    brimSkirt: false,
    source: 'default',
    notes: 'Default recommendations — verify on the original model page.',
  }
}

function parseSettings(data: any, categoryName: string): PrintSettings {
  const files: any[] = data?.print?.stlFiles ?? []
  const all = files.map((f: any) => f.printSettings).filter(Boolean)

  if (all.length === 0) return categoryDefaults(categoryName)

  const materials = all.map((s: any) => s.material).filter(Boolean)
  const infills = all.map((s: any) => s.infill).filter((v: any) => v != null && v > 0)
  const heights = all.map((s: any) => s.layerHeight).filter((v: any) => v != null && v > 0)
  const supportsNeeded = all.some((s: any) => s.supportsSettings?.enabled === true)
  const brimSkirt = all.some((s: any) => s.brimSkirt === true)

  const material = materials[0] ?? categoryDefaults(categoryName).material
  const infill = infills.length > 0
    ? Math.round(infills.reduce((a: number, b: number) => a + b, 0) / infills.length)
    : categoryDefaults(categoryName).infill
  const layerHeight = heights.length > 0 ? heights[0] : 0.2

  return {
    material,
    infill,
    layerHeight,
    supportsNeeded,
    brimSkirt,
    source: 'printables',
    notes: null,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Read model from DB (get cached print_settings + category for fallback)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: model } = await supabase
    .from('models')
    .select('id, print_settings, category_name, url')
    .eq('id', id)
    .single()

  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return cached
  if (model.print_settings) {
    return NextResponse.json({ ...model.print_settings, modelUrl: model.url })
  }

  // Fetch from Printables
  let settings: PrintSettings
  try {
    const resp = await fetch(PRINTABLES_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible)',
      },
      body: JSON.stringify({ query: QUERY, variables: { id } }),
    })
    const json = await resp.json()
    settings = parseSettings(json?.data, model.category_name ?? '')
  } catch {
    settings = categoryDefaults(model.category_name ?? '')
  }

  // Try to cache (requires update policy on models — see migration 009)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    await admin.from('models').update({ print_settings: settings }).eq('id', id)
  }

  return NextResponse.json({ ...settings, modelUrl: model.url })
}
