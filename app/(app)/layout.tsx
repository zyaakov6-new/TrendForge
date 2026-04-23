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
  AlertTriangle,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { useLanguage } from "@/context/LanguageContext";

// Nav items
const NAV_ITEMS: Array<{
  href: string;
  icon: React.ElementType;
  label: string;
  ai?: boolean;
}> = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/markets", icon: Compass, label: "Discover Markets" },
  { href: "/ai-generator", icon: Sparkles, label: "AI Generator", ai: true },
  { href: "/portfolio", icon: BarChart3, label: "Portfolio" },
  { href: "/trends", icon: TrendingUp, label: "Trends" },
];

// Sidebar content (shared between desktop + mobile)
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
          <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500 shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-shadow">
            <Flame className="w-4 h-4 text-black" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-base font-black tracking-tight text-white whitespace-nowrap overflow-hidden"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
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

      {/* Nav links */}
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
                  active
                    ? "text-cyan-400"
                    : ai && !active
                    ? "text-violet-400"
                    : ""
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

      {/* Bottom - settings */}
      <div className="px-2 py-3 border-t border-white/5">
        <Link
          href="/settings"
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

// Wallet section - handles all three states: disconnected, wrong network, connected
function WalletSection() {
  const {
    isConnected,
    isConnecting,
    isWrongNetwork,
    isSwitchingChain,
    switchToPolygon,
    formattedBalance,
    truncatedAddress,
  } = useWallet();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function copyAddress() {
    if (!truncatedAddress) return;
    navigator.clipboard.writeText(truncatedAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Not connected - show connect button via RainbowKit Custom
  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <motion.button
            onClick={openConnectModal}
            disabled={isConnecting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-500/8 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:border-cyan-500/60 hover:bg-cyan-500/15 transition-all disabled:opacity-50"
          >
            <Wallet className="w-3.5 h-3.5" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </motion.button>
        )}
      </ConnectButton.Custom>
    );
  }

  // Wrong network - prompt switch to Polygon
  if (isWrongNetwork) {
    return (
      <motion.button
        onClick={switchToPolygon}
        disabled={isSwitchingChain}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-500/15 transition-all"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        {isSwitchingChain ? "Switching..." : "Switch to Polygon"}
      </motion.button>
    );
  }

  // Connected - show balance + address with dropdown
  return (
    <div className="relative flex items-center gap-2">
      {/* USDC balance */}
      {formattedBalance !== null && (
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {formattedBalance}
          </span>
          <span className="text-[10px] text-emerald-400/50 font-medium">
            USDC
          </span>
        </div>
      )}

      {/* Address chip with dropdown */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white hover:border-white/20 transition-all"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="font-mono">{truncatedAddress}</span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0a0a18] shadow-xl z-50"
            >
              <button
                onClick={() => { copyAddress(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors rounded-t-xl"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied!" : "Copy address"}
              </button>
              <div className="h-px bg-white/5" />
              <button
                onClick={() => { disconnect(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-xs text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/5 transition-colors rounded-b-xl"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Page title map
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/markets": "Discover Markets",
  "/ai-generator": "AI Generator",
  "/portfolio": "Portfolio",
  "/trends": "Trends",
  "/settings": "Settings",
};

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { lang, toggleLang } = useLanguage();
  const title = PAGE_TITLES[pathname] ?? "TrendForge";

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 px-4 md:px-5 border-b border-white/5 bg-[#03030a]/85 backdrop-blur-md flex-shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 mr-3 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <span
        className="hidden sm:block text-sm font-bold text-white/60"
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        {title}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/45 hover:text-white hover:border-white/15 transition-all"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === "en" ? "עב" : "EN"}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/5 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </button>

        {/* Wallet section - real wagmi state */}
        <WalletSection />

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-black text-xs font-black cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
          TF
        </div>
      </div>
    </header>
  );
}

// Root app layout
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
      style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
    >
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 min-h-screen">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
