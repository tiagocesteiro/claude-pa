import Link from 'next/link'
import { Printer } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-2 font-semibold text-[var(--fg)]">
          <Printer size={16} className="text-[var(--accent)]" />
          PrintPal
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/en/catalog" className="hover:text-[var(--fg)] transition-colors">Catalog</Link>
          <Link href="/en/makers" className="hover:text-[var(--fg)] transition-colors">Makers</Link>
          <Link href="/en/auth/signup" className="hover:text-[var(--fg)] transition-colors">Sign up</Link>
        </nav>
        <p>© {new Date().getFullYear()} PrintPal</p>
      </div>
    </footer>
  )
}
