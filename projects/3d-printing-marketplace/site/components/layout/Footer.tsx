import Link from 'next/link'
import { Printer } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ background: '#1A0F00' }}>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-white">
          <Printer size={16} className="text-[var(--accent)]" />
          PrintPal
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/en/catalog" className="text-white/40 hover:text-white/70 transition-colors">Catalog</Link>
          <Link href="/en/auth/signup" className="text-white/40 hover:text-white/70 transition-colors">Sign up</Link>
        </nav>
        <p className="text-white/25 text-xs font-mono">© {new Date().getFullYear()} PrintPal · Lisbon</p>
      </div>
    </footer>
  )
}
