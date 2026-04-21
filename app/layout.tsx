import type { Metadata } from "next";
import { Oxanium, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

// Display / heading font - technical, distinctive, not generic
const oxanium = Oxanium({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Monospace font for numbers, addresses, data
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrendForge | AI Prediction Markets from X Trends",
  description:
    "Claude AI scans real-time X trends and Israeli news to instantly create tradable prediction markets. Trade the future in seconds on Polygon.",
  keywords: [
    "prediction markets",
    "AI",
    "Claude",
    "trading",
    "crypto",
    "Israel",
    "X trends",
  ],
  openGraph: {
    title: "TrendForge - Markets appear before the news does.",
    description:
      "Claude AI turns X trends into live prediction markets instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${oxanium.variable} ${ibmPlexMono.variable}`}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
