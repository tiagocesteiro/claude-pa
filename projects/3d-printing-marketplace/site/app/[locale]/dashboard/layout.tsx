import Link from 'next/link'
import { LayoutDashboard, Package, MessageSquare, List } from 'lucide-react'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const l = (p: string) => `/${locale}${p}`

  const links = [
    { href: l('/dashboard'), label: 'Overview', icon: LayoutDashboard },
    { href: l('/dashboard/listings'), label: 'My Listings', icon: List },
    { href: l('/dashboard/orders'), label: 'Orders', icon: Package },
    { href: l('/dashboard/messages'), label: 'Messages', icon: MessageSquare },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <nav className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--fg)] transition-colors">
                <Icon size={16} />{label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden w-full mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-[var(--border)] whitespace-nowrap hover:border-[var(--fg)] transition-colors">
                <Icon size={14} />{label}
              </Link>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
