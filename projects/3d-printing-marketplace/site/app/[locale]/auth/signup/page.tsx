'use client'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag } from 'lucide-react'

export default function SignUpPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1]
  const l = (p: string) => `/${locale}${p}`

  const [form, setForm] = useState({ email: '', password: '', displayName: '', city: '', role: 'buyer' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { display_name: form.displayName, role: form.role, location_city: form.city },
      },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(l(form.role === 'buyer' ? '/catalog' : '/dashboard'))
    router.refresh()
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <ShoppingBag size={24} className="text-[var(--accent)]" />
          <span className="font-bold text-xl">PrintPal</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{t('signUp')}</h1>
        <p className="text-[var(--muted)] text-sm mb-6">
          {t('alreadyHaveAccount')}{' '}
          <Link href={l('/auth/signin')} className="text-[var(--accent)] font-medium hover:underline">{t('signIn')}</Link>
        </p>

        <form onSubmit={signUp} className="flex flex-col gap-4">
          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('role')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['buyer','maker','both'] as const).map(r => (
                <button key={r} type="button" onClick={() => set('role', r)}
                  className={`py-2 text-sm rounded-[var(--radius)] border font-medium transition-colors ${
                    form.role === r
                      ? 'bg-[var(--fg)] text-white border-[var(--fg)]'
                      : 'border-[var(--border)] hover:border-[var(--fg)]'
                  }`}>
                  {r === 'buyer' ? t('roleBuyer') : r === 'maker' ? t('roleMaker') : t('roleBoth')}
                </button>
              ))}
            </div>
          </div>

          {[
            { key: 'displayName', label: t('displayName'), type: 'text' },
            { key: 'city', label: t('city'), type: 'text' },
            { key: 'email', label: t('email'), type: 'email' },
            { key: 'password', label: t('password'), type: 'password' },
          ].map(({ key, label, type }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{label}</label>
              <input
                type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} required
                className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
          ))}

          {error && <p className="text-[var(--accent)] text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-[var(--fg)] text-white py-2.5 rounded-[var(--radius)] font-medium text-sm hover:bg-[var(--accent)] transition-colors disabled:opacity-50">
            {loading ? '...' : t('signUp')}
          </button>
        </form>
      </div>
    </div>
  )
}
