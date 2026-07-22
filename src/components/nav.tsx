"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Repeat,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeftRight,
  History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rendimentos", label: "Rendimentos", icon: Wallet },
  { href: "/despesas", label: "Despesas", icon: Receipt },
  { href: "/movimentos", label: "Movimentos", icon: ArrowLeftRight },
  { href: "/subscricoes", label: "Subscrições", icon: Repeat },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/definicoes", label: "Definições", icon: Settings },
];

export default function Nav({
  userEmail,
  fullName,
  avatarUrl,
}: {
  userEmail: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    sessionStorage.removeItem("pin-desbloqueado");
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const Logo = () => (
    <div className="flex h-8 items-end gap-[3px]">
      <span className="h-3 w-1.5 rounded-sm bg-gold/60" />
      <span className="h-5 w-1.5 rounded-sm bg-gold" />
      <span className="h-7 w-1.5 rounded-sm bg-gold-bright" />
    </div>
  );

  return (
    <>
      {/* Sidebar — desktop */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-border-subtle md:bg-bg-surface/50 md:px-4 md:py-6">
        <div className="mb-8 flex items-center gap-2 px-2">
          <Logo />
          <span className="text-sm font-medium tracking-tightish text-ink">Finanças</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition ${
                  active
                    ? "bg-bg-raised text-gold"
                    : "text-ink-muted hover:bg-bg-hover hover:text-ink"
                }`}
              >
                <Icon size={17} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border-subtle pt-4">
          <div className="mb-2 flex items-center gap-2 px-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-raised text-xs text-gold">
                {(fullName || userEmail || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs text-ink">{fullName || "Sem nome"}</p>
              <p className="truncate text-[10px] text-ink-faint">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-ink-muted transition hover:bg-bg-hover hover:text-negative"
          >
            <LogOut size={17} strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </aside>

      {/* Barra superior — mobile */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-border-subtle bg-bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-sm font-medium tracking-tightish text-ink">Finanças</span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded text-ink-muted transition hover:bg-bg-hover hover:text-gold"
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
      </header>

      {/* Menu em ecrã inteiro — mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg md:hidden">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-sm font-medium tracking-tightish text-ink">Finanças</span>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
              className="flex h-9 w-9 items-center justify-center rounded text-ink-muted transition hover:bg-bg-hover hover:text-gold"
            >
              <X size={22} strokeWidth={1.75} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded px-3 py-3 text-base transition ${
                    active
                      ? "bg-bg-raised text-gold"
                      : "text-ink-muted hover:bg-bg-hover hover:text-ink"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border-subtle p-4">
            <div className="mb-2 flex items-center gap-2 px-1">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-raised text-xs text-gold">
                  {(fullName || userEmail || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{fullName || "Sem nome"}</p>
                <p className="truncate text-xs text-ink-faint">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded px-3 py-3 text-base text-ink-muted transition hover:bg-bg-hover hover:text-negative"
            >
              <LogOut size={20} strokeWidth={1.75} />
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}
