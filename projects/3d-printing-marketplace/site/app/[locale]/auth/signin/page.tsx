'use client'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag } from 'lucide-react'

export default function SignInPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1]
  const l = (p: string) => `/${locale}${p}`

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(l('/'))
    router.refresh()
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <ShoppingBag size={24} className="text-[var(--accent)]" />
          <span className="font-bold text-xl">PrintPal</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{t('signIn')}</h1>
        <p className="text-[var(--muted)] text-sm mb-6">
          {t('noAccount')}{' '}
          <Link href={l('/auth/signup')} className="text-[var(--accent)] font-medium hover:underline">{t('signUp')}</Link>
        </p>

        <form onSubmit={signIn} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('email')}</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t('password')}</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
          </div>
          {error && <p className="text-[var(--accent)] text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="bg-[var(--fg)] text-white py-2.5 rounded-[var(--radius)] font-medium text-sm hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}
