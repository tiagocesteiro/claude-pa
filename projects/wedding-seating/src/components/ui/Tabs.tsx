import Link from "next/link";

export interface TabItem {
  label: string;
  href: string;
  active: boolean;
}

/** Underlined tab navigation. Horizontally scrollable on narrow viewports. */
export default function Tabs({ tabs }: { tabs: TabItem[] }) {
  return (
    <nav className="tabs" aria-label="Secções">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={["tab", tab.active ? "tab-active" : ""].filter(Boolean).join(" ")}
          aria-current={tab.active ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
