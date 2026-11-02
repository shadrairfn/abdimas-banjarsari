"use client";

import Link from "next/link";
import { Columns2, Info, LayoutDashboard, List, LogOut, Map as MapIcon, Moon, ShieldCheck, Store, Sun, Users } from "lucide-react";
import { useTheme } from "@/lib/theme/use-theme";

// Icons are chosen by name so server components can pass them to this client component.
const RAIL_ICONS = {
  map: MapIcon,
  compare: Columns2,
  list: List,
  info: Info,
  shield: ShieldCheck,
  dashboard: LayoutDashboard,
  users: Users,
  logout: LogOut,
};

export interface RailItem {
  label: string;
  icon: keyof typeof RAIL_ICONS;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

interface RailProps {
  items: RailItem[];
  // Items below the spacer, above the theme button.
  footerItems?: RailItem[];
}

function RailButton({ item }: { item: RailItem }) {
  const Icon = RAIL_ICONS[item.icon];
  const className = `ri${item.active ? " on" : ""}`;

  if (item.href) {
    return (
      <Link className={className} href={item.href} aria-label={item.label} title={item.label}>
        <Icon className="i" />
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={item.onClick} aria-label={item.label} title={item.label}>
      <Icon className="i" />
    </button>
  );
}

/** The 56px navigation rail on the left of every desktop page. */
export function Rail({ items, footerItems = [] }: RailProps) {
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <nav className="rail" aria-label="Navigasi">
      <Link
        href="/"
        aria-label="Peta UMKM"
        style={{
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          borderRadius: "var(--r)",
          background: "var(--pri)",
          color: "var(--prf)",
          marginBottom: 8,
        }}
      >
        <Store className="i" />
      </Link>
      {items.map((item) => <RailButton key={item.label} item={item} />)}
      <div style={{ flex: 1 }} />
      {footerItems.map((item) => <RailButton key={item.label} item={item} />)}
      <button type="button" className="ri" onClick={toggleTheme} aria-label="Tema" title="Tema">
        <ThemeIcon className="i" />
      </button>
    </nav>
  );
}
