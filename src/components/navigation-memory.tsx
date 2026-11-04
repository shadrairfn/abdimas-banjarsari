"use client";
import { useEffect } from "react";

/** The browser keeps the route; retain its scroll position across a full reload too. */
export function NavigationMemory() {
  useEffect(() => {
    let frame = 0;
    const key = () => `scroll:${location.pathname}${location.search}`;
    const save = () => { try { sessionStorage.setItem(key(), String(window.scrollY)); } catch {} };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(save); };
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interrupted = false;
    const interrupt = () => { interrupted = true; };
    if (navigation?.type === "reload") {
      let y = 0; try { y = Number(sessionStorage.getItem(key())) || 0; } catch {}
      for (const delay of [0, 150, 500, 1000]) timers.push(setTimeout(() => { if (!interrupted) window.scrollTo(0, y); }, delay));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("pointerdown", interrupt, { passive: true });
    return () => { save(); cancelAnimationFrame(frame); timers.forEach(clearTimeout); window.removeEventListener("scroll", onScroll); window.removeEventListener("pagehide", save); window.removeEventListener("wheel", interrupt); window.removeEventListener("pointerdown", interrupt); };
  }, []);
  return null;
}
