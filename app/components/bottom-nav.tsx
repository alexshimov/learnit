"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Plus, BarChart3 } from "@/app/components/icons";

const items = [
  { href: "/", label: "Today", icon: Home },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/import", label: "Add", icon: Plus, primary: true },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-10 border-t border-border"
      style={{ background: "color-mix(in srgb, var(--surface-1) 88%, transparent)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-1"
              >
                <span className="btn-brand flex h-11 w-11 items-center justify-center rounded-full">
                  <Icon size={22} strokeWidth={2.2} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5"
              style={{ color: active ? "var(--brand)" : "var(--text-muted)" }}
            >
              <Icon size={22} strokeWidth={active ? 2.3 : 1.9} />
              <span className="text-[11px]" style={{ fontWeight: active ? 500 : 400 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
