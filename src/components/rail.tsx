"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Columns2, Info, KeyRound, LayoutDashboard, List, LogOut, Map as MapIcon, Moon, ScrollText, ShieldCheck, Store, Sun, Users } from "lucide-react";
import { useTheme } from "@/lib/theme/use-theme";

const railListeners = new Set<() => void>();
let memoryExpanded = true;
function readExpanded() { try { return localStorage.getItem("rail_expanded_v2") !== "false"; } catch { return memoryExpanded; } }

// Icons are chosen by name so server components can pass them to this client component.
const RAIL_ICONS = {
  map: MapIcon,
  compare: Columns2,
  list: List,
  info: Info,
  shield: ShieldCheck,
  dashboard: LayoutDashboard,
  users: Users,
  key: KeyRound,
  log: ScrollText,
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
        <span className="rail-label">{item.label}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={item.onClick} aria-label={item.label} title={item.label}>
      <Icon className="i" />
      <span className="rail-label">{item.label}</span>
    </button>
  );
}

/** Fixed desktop navigation, pinned open by default and expandable on menu hover. */
export function Rail({ items, footerItems = [] }: RailProps) {
  const pinned = useSyncExternalStore(listener => { railListeners.add(listener); return () => { railListeners.delete(listener); }; }, readExpanded, () => true);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;
  useEffect(() => { document.documentElement.dataset.railExpanded = String(expanded); }, [expanded]);
  function toggleExpanded() { memoryExpanded = !pinned; setHovered(false); try { localStorage.setItem("rail_expanded_v2", String(memoryExpanded)); } catch {} railListeners.forEach(listener => listener()); }
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  return <nav className={`rail${expanded ? " expanded" : ""}`} aria-label="Navigasi" data-pinned={pinned}>
    <div className="rail-header">
      <Link href="/" aria-label="Peta UMKM" className="rail-brand"><span className="rail-logo"><Store className="i" /></span><span className="rail-label fw6">Peta UMKM</span></Link>
      <button type="button" className="btn ic g sm rail-toggle" aria-label={pinned ? "Minimalkan sidebar" : "Perluas sidebar"} title={pinned ? "Minimalkan sidebar" : "Pertahankan sidebar terbuka"} aria-expanded={expanded} onClick={toggleExpanded}>{pinned ? <PanelLeftClose className="i" /> : <PanelLeftOpen className="i" />}</button>
    </div>
    <div className="rail-menus" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} onFocusCapture={() => setHovered(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
      {items.map(item => <RailButton key={item.label} item={item} />)}
      <div className="rail-spacer" />
      {footerItems.map(item => <RailButton key={item.label} item={item} />)}
      <button type="button" className="ri" onClick={toggleTheme} aria-label="Tema" title="Tema"><ThemeIcon className="i" /><span className="rail-label">Ubah tema</span></button>
    </div>
  </nav>;
}
