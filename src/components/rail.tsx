"use client";

import {
  Columns2,
  Info,
  KeyRound,
  LayoutDashboard,
  List,
  LogOut,
  Map as MapIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShieldCheck,
  Store,
  Sun,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useTheme } from "@/lib/theme/use-theme";

const railListeners = new Set<() => void>();
let isSidebarExpandedInMemory = true;

function readExpanded() {
  try {
    return localStorage.getItem("rail_expanded_v2") !== "false";
  } catch {
    return isSidebarExpandedInMemory;
  }
}

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
    <button
      type="button"
      className={className}
      onClick={item.onClick}
      aria-label={item.label}
      title={item.label}
    >
      <Icon className="i" />
      <span className="rail-label">{item.label}</span>
    </button>
  );
}

/** Fixed desktop navigation, pinned open by default and expandable on menu hover. */
export function Rail({ items, footerItems = [] }: RailProps) {
  const isPinned = useSyncExternalStore(
    (listener) => {
      railListeners.add(listener);

      return () => {
        railListeners.delete(listener);
      };
    },
    readExpanded,
    () => true,
  );
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isPinned || isHovered;
  useEffect(() => {
    document.documentElement.dataset.railExpanded = String(isExpanded);
  }, [isExpanded]);

  function toggleExpanded() {
    isSidebarExpandedInMemory = !isPinned;
    setIsHovered(false);

    try {
      localStorage.setItem("rail_expanded_v2", String(isSidebarExpandedInMemory));
    } catch {}

    railListeners.forEach((listener) => listener());
  }
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <nav
      className={`rail${isExpanded ? " expanded" : ""}`}
      aria-label="Navigasi"
      data-pinned={isPinned}
    >
      <div className="rail-header">
        <Link href="/" aria-label="UMKM Banjarsari" className="rail-brand">
          <span className="rail-logo">
            <Store className="i" />
          </span>
          <span className="rail-label fw6">UMKM Banjarsari</span>
        </Link>
        <button
          type="button"
          className="btn ic g sm rail-toggle"
          aria-label={isPinned ? "Minimalkan sidebar" : "Perluas sidebar"}
          title={isPinned ? "Minimalkan sidebar" : "Pertahankan sidebar terbuka"}
          aria-expanded={isExpanded}
          onClick={toggleExpanded}
        >
          {isPinned ? <PanelLeftClose className="i" /> : <PanelLeftOpen className="i" />}
        </button>
      </div>
      <div
        className="rail-menus"
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsHovered(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsHovered(false);
          }
        }}
      >
        {items.map((item) => (
          <RailButton key={item.label} item={item} />
        ))}
        <div className="rail-spacer" />
        {footerItems.map((item) => (
          <RailButton key={item.label} item={item} />
        ))}
        <button type="button" className="ri" onClick={toggleTheme} aria-label="Tema" title="Tema">
          <ThemeIcon className="i" />
          <span className="rail-label">Ubah tema</span>
        </button>
      </div>
    </nav>
  );
}
