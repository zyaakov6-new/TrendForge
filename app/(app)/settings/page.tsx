"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Bell, Palette, Sliders, Shield, Info,
  Copy, Check, LogOut, Wallet, Globe, Moon, Zap,
  ChevronRight, ExternalLink, AlertTriangle, Volume2,
  VolumeX, BellOff, Mail, Smartphone,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = "profile" | "display" | "notifications" | "trading" | "security" | "about";

// ─── Section registry ────────────────────────────────────────────────────────

const SECTIONS: Array<{ key: Section; icon: React.ElementType; label: string; description: string }> = [
  { key: "profile",       icon: User,    label: "Profile & Wallet",    description: "Identity and connected wallet" },
  { key: "display",       icon: Palette, label: "Display",             description: "Theme, language, layout" },
  { key: "notifications", icon: Bell,    label: "Notifications",       description: "Alerts and activity updates" },
  { key: "trading",       icon: Sliders, label: "Trading Preferences", description: "Slippage, limits, defaults" },
  { key: "security",      icon: Shield,  label: "Security",            description: "Session and approvals" },
  { key: "about",         icon: Info,    label: "About",               description: "Version and legal" },
];

// ─── Reusable primitives ─────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-white/[0.025] p-5 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">{children}</h2>;
}

function Row({
  label,
  description,
  children,
  topBorder = true,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  topBorder?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-4 ${topBorder ? "border-t border-white/5" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && <p className="text-xs text-white/35 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        value ? "bg-cyan-500" : "bg-white/10"
      }`}
    >
      <motion.span
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg border border-white/10 bg-[#0c0c1f] px-3 py-1.5 text-xs font-semibold text-white/70 focus:outline-none focus:border-cyan-500/50 transition-colors"
      style={{ color: "rgba(255,255,255,0.7)" }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: "#0c0c1f" }}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Section panels ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { address, isConnected, truncatedAddress } = useWallet();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Wallet</SectionTitle>

        {isConnected ? (
          <>
            {/* Address display */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/6 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-black text-sm font-black flex-shrink-0">
                TF
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/35 font-medium mb-0.5">Connected on Polygon</p>
                <p className="text-sm font-bold text-white font-mono truncate">{truncatedAddress}</p>
              </div>
              <button
                onClick={copyAddress}
                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <Row label="View on PolygonScan" topBorder={false}>
              <a
                href={`https://polygonscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Open <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Row>

            <Row label="Disconnect wallet" description="You can reconnect anytime">
              <button
                onClick={() => { disconnect(); toast.success("Wallet disconnected"); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-400/70 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Disconnect
              </button>
            </Row>
          </>
        ) : (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <div className="text-center py-6">
                <Wallet className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-sm text-white/40 mb-4">No wallet connected</p>
                <button
                  onClick={openConnectModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-5 py-2.5 text-sm font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
                >
                  <Wallet className="w-4 h-4" /> Connect Wallet
                </button>
              </div>
            )}
          </ConnectButton.Custom>
        )}
      </Card>

      <Card>
        <SectionTitle>Display Name</SectionTitle>
        <Row label="Username" description="Used in comments and leaderboards" topBorder={false}>
          <input
            type="text"
            defaultValue="Anon Trader"
            className="rounded-lg border border-white/10 bg-[#0c0c1f] px-3 py-1.5 text-xs font-semibold w-36 focus:outline-none focus:border-cyan-500/50 transition-colors"
            style={{ color: "white" }}
          />
        </Row>
      </Card>
    </div>
  );
}

function DisplaySection() {
  const { lang, toggleLang } = useLanguage();
  const [compactView, setCompactView] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [chartStyle, setChartStyle] = useState("area");

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <Row label="Theme" description="Dark mode is always on — we know you like it" topBorder={false}>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <Moon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 font-semibold">Dark</span>
          </div>
        </Row>
        <Row label="Animations" description="Smooth transitions and micro-interactions">
          <Toggle value={animationsEnabled} onChange={setAnimationsEnabled} />
        </Row>
        <Row label="Compact market cards" description="More markets on screen at once">
          <Toggle value={compactView} onChange={setCompactView} />
        </Row>
      </Card>

      <Card>
        <SectionTitle>Language & Region</SectionTitle>
        <Row label="Interface language" topBorder={false}>
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/60 hover:border-white/20 hover:text-white transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "English" : "עברית"}
            <ChevronRight className="w-3 h-3 text-white/25" />
          </button>
        </Row>
        <Row label="Price display" description="How probabilities are shown">
          <Select
            value="cents"
            onChange={() => {}}
            options={[
              { value: "cents", label: "Cents (67¢)" },
              { value: "percent", label: "Percent (67%)" },
              { value: "decimal", label: "Decimal (0.67)" },
            ]}
          />
        </Row>
      </Card>

      <Card>
        <SectionTitle>Charts</SectionTitle>
        <Row label="Default chart style" topBorder={false}>
          <Select
            value={chartStyle}
            onChange={setChartStyle}
            options={[
              { value: "area", label: "Area" },
              { value: "line", label: "Line" },
              { value: "candle", label: "Candlestick" },
            ]}
          />
        </Row>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const [browserAlerts, setBrowserAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [tradeConfirm, setTradeConfirm] = useState(true);
  const [resolutionAlerts, setResolutionAlerts] = useState(true);
  const [aiMarkets, setAiMarkets] = useState(false);
  const [emailDigest, setEmailDigest] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Push Notifications</SectionTitle>
        <Row
          label="Browser notifications"
          description="Allow TrendForge to send browser alerts"
          topBorder={false}
        >
          <Toggle value={browserAlerts} onChange={setBrowserAlerts} />
        </Row>
        <Row label="Price movement alerts" description="When a market moves >5% in 1 hour">
          <Toggle value={priceAlerts} onChange={setPriceAlerts} />
        </Row>
        <Row label="Trade confirmations" description="On-chain transaction confirmed">
          <Toggle value={tradeConfirm} onChange={setTradeConfirm} />
        </Row>
        <Row label="Market resolution" description="When markets you hold resolve">
          <Toggle value={resolutionAlerts} onChange={setResolutionAlerts} />
        </Row>
        <Row label="New AI-generated markets" description="Claude forges a market on a trending topic">
          <Toggle value={aiMarkets} onChange={setAiMarkets} />
        </Row>
      </Card>

      <Card>
        <SectionTitle>Email</SectionTitle>
        <Row
          label="Weekly digest"
          description="Top trending markets and your portfolio summary"
          topBorder={false}
        >
          <Toggle value={emailDigest} onChange={setEmailDigest} />
        </Row>
        {emailDigest && (
          <div className="mt-3">
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-xl border border-white/10 bg-[#0c0c1f] px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-white/20"
              style={{ color: "white" }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function TradingSection() {
  const [slippage, setSlippage] = useState("0.5");
  const [maxTrade, setMaxTrade] = useState("1000");
  const [defaultSide, setDefaultSide] = useState("YES");
  const [autoApprove, setAutoApprove] = useState(false);
  const [confirmTrades, setConfirmTrades] = useState(true);
  const [showGasFee, setShowGasFee] = useState(true);

  const slippageOptions = ["0.1", "0.5", "1.0", "2.0", "custom"];

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Order Settings</SectionTitle>
        <Row label="Slippage tolerance" description="Max price movement you accept per trade" topBorder={false}>
          <div className="flex gap-1.5">
            {["0.1", "0.5", "1.0", "2.0"].map(v => (
              <button
                key={v}
                onClick={() => setSlippage(v)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  slippage === v
                    ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                    : "bg-white/5 border border-white/8 text-white/40 hover:text-white"
                }`}
              >
                {v}%
              </button>
            ))}
          </div>
        </Row>
        <Row label="Max single trade" description="Hard cap in USDC per transaction">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/30">$</span>
            <input
              type="number"
              value={maxTrade}
              onChange={e => setMaxTrade(e.target.value)}
              className="w-24 rounded-lg border border-white/10 bg-[#0c0c1f] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500/50 transition-colors"
              style={{ color: "white" }}
            />
          </div>
        </Row>
        <Row label="Default outcome" description="Pre-selected when opening a market">
          <Select
            value={defaultSide}
            onChange={setDefaultSide}
            options={[
              { value: "YES", label: "YES" },
              { value: "NO", label: "NO" },
            ]}
          />
        </Row>
      </Card>

      <Card>
        <SectionTitle>UX</SectionTitle>
        <Row label="Confirm trades" description="Show confirmation dialog before submitting" topBorder={false}>
          <Toggle value={confirmTrades} onChange={setConfirmTrades} />
        </Row>
        <Row label="Show gas estimate" description="Display estimated Polygon gas fee before trade">
          <Toggle value={showGasFee} onChange={setShowGasFee} />
        </Row>
        <Row label="Auto-approve USDC" description="Skip approve tx on repeat trades (advanced)">
          <Toggle value={autoApprove} onChange={setAutoApprove} />
        </Row>
        {autoApprove && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange-500/25 bg-orange-500/8 p-3">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300/70">
              Auto-approve grants TrendForge's router contract unlimited USDC spend. Only enable if you understand the risk.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function SecuritySection() {
  const [sessionTimeout, setSessionTimeout] = useState("24h");

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Session</SectionTitle>
        <Row label="Session timeout" description="Auto-disconnect wallet after inactivity" topBorder={false}>
          <Select
            value={sessionTimeout}
            onChange={setSessionTimeout}
            options={[
              { value: "1h",    label: "1 hour" },
              { value: "8h",    label: "8 hours" },
              { value: "24h",   label: "24 hours" },
              { value: "never", label: "Never" },
            ]}
          />
        </Row>
      </Card>

      <Card>
        <SectionTitle>Smart Contract Approvals</SectionTitle>
        <p className="text-xs text-white/35 mb-4">
          Active USDC approvals granted to TrendForge contracts on Polygon.
        </p>
        <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">TrendForge Router</p>
            <p className="text-xs text-white/30 font-mono">0x742d…8fE3</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-2.5 py-1">
              500 USDC
            </span>
            <button className="text-xs text-rose-400/60 hover:text-rose-400 transition-colors font-semibold">
              Revoke
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Danger Zone</SectionTitle>
        <Row label="Clear local data" description="Removes cached prices, drafts, and history" topBorder={false}>
          <button
            onClick={() => {
              localStorage.clear();
              toast.success("Local data cleared");
            }}
            className="text-xs font-semibold text-rose-400/60 hover:text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg px-3 py-1.5 transition-all"
          >
            Clear data
          </button>
        </Row>
      </Card>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Application</SectionTitle>
        <Row label="Version" topBorder={false}>
          <span className="text-xs font-mono text-white/30">v0.1.0-beta</span>
        </Row>
        <Row label="AI Engine">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400">Claude Opus 4.7</span>
          </div>
        </Row>
        <Row label="Network">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-xs font-semibold text-white/60">Polygon PoS</span>
          </div>
        </Row>
        <Row label="Liquidity Protocol">
          <span className="text-xs text-white/40">Polymarket CLOB / Kuest AMM</span>
        </Row>
      </Card>

      <Card>
        <SectionTitle>Links</SectionTitle>
        {[
          { label: "Documentation",     href: "#" },
          { label: "GitHub",            href: "#" },
          { label: "Terms of Service",  href: "#" },
          { label: "Privacy Policy",    href: "#" },
          { label: "Discord Community", href: "#" },
        ].map((link, i) => (
          <Row key={link.label} label={link.label} topBorder={i > 0}>
            <a
              href={link.href}
              className="flex items-center gap-1 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Row>
        ))}
      </Card>

      <Card>
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-1.5 mb-2">
            <span className="text-lg font-black text-white">Trend</span>
            <span className="text-lg font-black text-cyan-400">Forge</span>
          </div>
          <p className="text-xs text-white/25">
            Prediction markets powered by Claude AI
          </p>
          <p className="text-xs text-white/15 mt-1">
            © 2026 TrendForge. Not financial advice.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const SECTION_PANELS: Record<Section, React.ComponentType> = {
  profile:       ProfileSection,
  display:       DisplaySection,
  notifications: NotificationsSection,
  trading:       TradingSection,
  security:      SecuritySection,
  about:         AboutSection,
};

export default function SettingsPage() {
  const [active, setActive] = useState<Section>("profile");
  const Panel = SECTION_PANELS[active];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-black text-white mb-1">Settings</h1>
        <p className="text-sm text-white/35">Manage your preferences and wallet</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
        {/* ── Sidebar nav ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="md:sticky md:top-20 self-start"
        >
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] overflow-hidden">
            {SECTIONS.map(({ key, icon: Icon, label, description }) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`relative w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                  active === key
                    ? "text-cyan-400 bg-cyan-500/8"
                    : "text-white/45 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {active === key && (
                  <motion.div
                    layoutId="settingsActiveBar"
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-400 rounded-r"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 ${active === key ? "text-cyan-400" : ""}`} />
                <span className="text-sm font-semibold truncate">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Panel ── */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Panel />
        </motion.div>
      </div>
    </div>
  );
}
