"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  BarChart3,
  Compass,
  Wallet,
  Globe,
  Menu,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  DollarSign,
  Zap,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/markets", icon: Compass, label: "Discover Markets" },
  { href: "/ai-generator", icon: Sparkles, label: "AI Generator", ai: true },
  { href: "/portfolio", icon: BarChart3, label: "Portfolio" },
  { href: "/trends", icon: TrendingUp, label: "Trends" },
] as const;

const MOCK_WALLET = "0x3d4F...8Ab2";
const MOCK_BALANCE = "1,842.50";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function SidebarContent({
  collapsed,
  onToggle,
  onNavClick,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavClick: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full select-none">
      {/* Logo row */}
      <div
        className={`flex items-center h-14 border-b border-white/5 px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link
          href="/dashboard"
          onClick={onNavClick}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-shadow">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-base font-black tracking-tight text-white whitespace-nowrap overflow-hidden"
              >
                Trend<span className="text-cyan-400">Forge</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {!collapsed && (
          <button
            onClick={onToggle}
            className="hidden lg:flex p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ href, icon: Icon, label, ai }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "text-cyan-400"
                  : "text-white/45 hover:text-white hover:bg-white/5"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activePill"
                  className="absolute inset-0 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              )}
              <Icon
                className={`relative z-10 w-4 h-4 flex-shrink-0 ${
                  active ? "text-cyan-400" : ai && !active ? "text-violet-400" : ""
                }`}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="relative z-10 truncate flex-1"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && ai && !active && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10 flex items-center gap-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400 flex-shrink-0"
                >
                  <Zap className="w-2 h-2" />
                  AI
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-white/5">
        <Link
          href="#"
          onClick={onNavClick}
          title={collapsed ? "Settings" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/30 hover:text-white hover:bg-white/5 transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </div>
  );
}

function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 232 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="relative hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 bg-[#06060f] border-r border-white/5 overflow-hidden z-20"
    >
      <SidebarContent
        collapsed={collapsed}
        onToggle={onToggle}
        onNavClick={() => {}}
      />
      {/* Expand handle when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="absolute bottom-[72px] -right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 border border-white/10 text-white/40 hover:text-white hover:bg-zinc-700 transition-all z-30"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </motion.aside>
  );
}

function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 bottom-0 w-[232px] bg-[#06060f] border-r border-white/5 z-50 lg:hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent
              collapsed={false}
              onToggle={() => {}}
              onNavClick={onClose}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/markets": "Discover Markets",
  "/ai-generator": "AI Generator",
  "/portfolio": "Portfolio",
  "/trends": "Trends",
};

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const [lang, setLang] = useState<"en" | "he">("en");
  const title = PAGE_TITLES[pathname] ?? "TrendForge";

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 px-4 md:px-5 border-b border-white/5 bg-[#03030a]/85 backdrop-blur-md flex-shrink-0">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 mr-3 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <span className="hidden sm:block text-sm font-bold text-white/70">
        {title}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Language */}
        <button
          onClick={() => setLang((l) => (l === "en" ? "he" : "en"))}
          className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/45 hover:text-white hover:border-white/15 transition-all"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === "en" ? "עב" : "EN"}
        </button>

        {/* Notification */}
        <button className="relative p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/5 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </button>

        {/* Balance */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {MOCK_BALANCE}
          </span>
          <span className="text-[10px] text-emerald-400/50 font-medium">
            USDC
          </span>
        </div>

        {/* Wallet */}
        <button className="hidden md:flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white hover:border-white/15 transition-all">
          <Wallet className="w-3.5 h-3.5" />
          <span className="font-mono">{MOCK_WALLET}</span>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-black cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
          ZY
        </div>
      </div>
    </header>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div
      className="flex min-h-screen bg-[#03030a] text-white"
      style={{
        fontFamily: "var(--font-syne), 'Syne', system-ui, sans-serif",
      }}
    >
      {/* Sidebar */}
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
