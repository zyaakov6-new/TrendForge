"use client";

/**
 * TrendForge - Providers
 *
 * Stack: wagmi v2 + viem + RainbowKit v2 + @tanstack/react-query v5
 *
 * Chains: Polygon mainnet (137) only — Amoy testnet removed until contracts are deployed
 *
 * Kuest integration notes:
 *  - Kuest deploys on Polygon PoS - same chain, no changes needed
 *  - USDC collateral: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 (mainnet)
 *  - When switching to Kuest contracts, add KUEST_CHAIN if they use a custom fork
 *  - WalletConnect projectId: get from https://cloud.walletconnect.com
 */

import { WagmiProvider } from "wagmi";
import { polygon } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

// Wagmi + RainbowKit config
// ssr: true is required for Next.js App Router hydration
const wagmiConfig = getDefaultConfig({
  appName: "TrendForge",
  // TODO: replace placeholder with real WalletConnect Cloud project ID
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    "trendforge-dev-placeholder",
  chains: [polygon],
  ssr: true,
});

// Singleton QueryClient - prevents new instance on every hot reload
let _queryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always fresh (no cross-request state leakage)
    return new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000 } },
    });
  }
  return (_queryClient ??= new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,         // 30s before refetch
        gcTime: 5 * 60_000,        // 5min cache lifetime
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }));
}

// Custom RainbowKit theme - matches the dark cyber aesthetic
const trendForgeTheme = darkTheme({
  accentColor: "#06b6d4",          // cyan-500
  accentColorForeground: "#000000",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={trendForgeTheme}
          appInfo={{
            appName: "TrendForge",
            learnMoreUrl: "https://trendforge.app",
          }}
        >
          <LanguageProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#0a0a18",
                  border:     "1px solid rgba(255,255,255,0.08)",
                  color:      "#fff",
                  fontFamily: "var(--font-display), sans-serif",
                },
              }}
            />
          </LanguageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
