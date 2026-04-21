"use client";

/**
 * WalletGate
 *
 * Wraps any protected page content. If the user is not connected,
 * shows a blurred overlay with a connect prompt instead of the content.
 *
 * Usage:
 *   export default function PortfolioPage() {
 *     return (
 *       <WalletGate title="Connect to view your portfolio">
 *         <YourPageContent />
 *       </WalletGate>
 *     )
 *   }
 */

import { motion } from "framer-motion";
import { Lock, Flame } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/hooks/useWallet";
import type { ReactNode } from "react";

interface WalletGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function WalletGate({
  children,
  title = "Connect your wallet",
  description = "Connect a wallet to start trading on TrendForge. Trades execute on Polygon with USDC - no KYC required under $10K.",
}: WalletGateProps) {
  const { isConnected } = useWallet();

  if (isConnected) return <>{children}</>;

  return (
    <div className="relative min-h-[70vh] flex items-center justify-center p-6">
      {/* Blurred background preview */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="h-full opacity-[0.07] blur-sm scale-105 select-none">
          {children}
        </div>
      </div>

      {/* Connect card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-sm w-full rounded-2xl border border-white/10 bg-[#06060f]/95 backdrop-blur-xl p-8 text-center"
      >
        {/* Icon */}
        <div className="relative mx-auto mb-6 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-cyan-400" />
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
            <Flame className="w-3 h-3 text-black" />
          </div>
        </div>

        <h2
          className="text-xl font-black text-white mb-2"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          {title}
        </h2>
        <p className="text-sm text-white/40 leading-relaxed mb-7">
          {description}
        </p>

        <div className="flex justify-center">
          <ConnectButton
            label="Connect Wallet"
            showBalance={false}
            chainStatus="none"
          />
        </div>

        <p className="text-[11px] text-white/20 mt-5 leading-relaxed">
          MetaMask, WalletConnect, Coinbase Wallet supported
          <br />
          Trades on{" "}
          <span className="text-violet-400/60">Polygon</span> with USDC
        </p>
      </motion.div>
    </div>
  );
}
