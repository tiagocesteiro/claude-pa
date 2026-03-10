'use client'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Printer, Menu, X, Globe } from 'lucide-react'

export default function Navbar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [open, setOpen] = useState(false)

  const locale = pathname.split('/')[1] || 'en'
  const isMaker = profile?.role === 'maker' || profile?.role === 'both'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('profiles').select('*').eq('id', data.user.id).single()
          .then(({ data: p }) => setProfile(p))
      }
    })
  }, [])

  const l = (path: string) => `/${locale}${path}`

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(l('/'))
    router.refresh()
  }

  const switchLocale = () => {
    const other = locale === 'en' ? 'pt' : 'en'
    const rest = pathname.split('/').slice(2).join('/')
    router.push(`/${other}/${rest}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={l('/')} className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Printer size={20} className="text-[var(--accent)]" />
          PrintPal
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href={l('/catalog')} className={`transition-colors ${pathname.includes('/catalog') ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>{t('catalog')}</Link>
          <Link href={l('/makers')} className={`transition-colors ${pathname.includes('/makers') ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>{t('makers')}</Link>
          {isMaker && (
            <Link href={l('/dashboard')} className={`transition-colors ${pathname.includes('/dashboard') ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}>{t('dashboard')}</Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={switchLocale} className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors">
            <Globe size={14} />{locale === 'en' ? 'PT' : 'EN'}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <Link href={l('/account')} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">{t('account')}</Link>
              <button onClick={signOut} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">{t('signOut')}</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={l('/auth/signin')} className="text-sm font-medium text-[var(--muted)] hover:text-[var(--fg)]">{t('signIn')}</Link>
              <Link href={l('/auth/signup')} className="text-sm font-medium bg-[var(--fg)] text-white px-4 py-1.5 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors">{t('signUp')}</Link>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)] px-4 py-4 flex flex-col gap-4 text-sm font-medium">
          <Link href={l('/catalog')} onClick={() => setOpen(false)}>{t('catalog')}</Link>
          <Link href={l('/makers')} onClick={() => setOpen(false)}>{t('makers')}</Link>
          {isMaker && <Link href={l('/dashboard')} onClick={() => setOpen(false)}>{t('dashboard')}</Link>}
          {user ? (
            <>
              <Link href={l('/account')} onClick={() => setOpen(false)}>{t('account')}</Link>
              <button onClick={signOut} className="text-left">{t('signOut')}</button>
            </>
          ) : (
            <>
              <Link href={l('/auth/signin')} onClick={() => setOpen(false)}>{t('signIn')}</Link>
              <Link href={l('/auth/signup')} onClick={() => setOpen(false)}>{t('signUp')}</Link>
            </>
          )}
          <button onClick={switchLocale} className="flex items-center gap-1 text-[var(--muted)]">
            <Globe size={14} />{locale === 'en' ? 'Português' : 'English'}
          </button>
        </div>
      )}
    </header>
  )
}
