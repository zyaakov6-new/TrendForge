// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketCategory =
  | "Politics"
  | "Geopolitics"
  | "Crypto"
  | "Tech"
  | "Finance"
  | "Sports"
  | "Israel";

export interface Market {
  id: string;
  question: string;
  category: MarketCategory;
  yesPrice: number;     // 0–100 (cents)
  volume: number;       // raw USD
  daysLeft: number;
  aiGenerated: boolean;
  trending: boolean;
  change: number;       // 24-hour price-change in percentage points
  resolveDate: string;
  traders: number;
  liquidity: number;
  description?: string;
}

export interface Position {
  id: string;
  marketId: string;
  question: string;
  side: "YES" | "NO";
  shares: number;
  entryPrice: number;   // 0–1
  currentPrice: number; // 0–1
  category: MarketCategory;
  resolveDate: string;
  status: "open" | "resolved_yes" | "resolved_no";
}

export interface GeneratedMarketHistory {
  id: string;
  question: string;
  category: MarketCategory;
  yesPrice: number;
  volume: number;
  published: boolean;
  createdAt: string;
  topic: string;
}

// ─── Markets ──────────────────────────────────────────────────────────────────

export const MARKETS: Market[] = [
  {
    id: "1",
    question: "Will Netanyahu call snap elections before August 2026?",
    category: "Politics",
    yesPrice: 67,
    volume: 184200,
    daysLeft: 42,
    aiGenerated: true,
    trending: true,
    change: 8.3,
    resolveDate: "Jul 31, 2026",
    traders: 1243,
    liquidity: 32000,
    description:
      "Resolves YES if Netanyahu officially announces snap elections before August 1, 2026 per credible Israeli news sources.",
  },
  {
    id: "2",
    question: "Will Israel–Hamas ceasefire hold through end of May 2026?",
    category: "Geopolitics",
    yesPrice: 41,
    volume: 312550,
    daysLeft: 39,
    aiGenerated: true,
    trending: true,
    change: -4.1,
    resolveDate: "May 31, 2026",
    traders: 2891,
    liquidity: 64000,
    description:
      "Resolves YES if the ceasefire remains formally in effect on May 31, 2026 with no large-scale resumption of hostilities.",
  },
  {
    id: "3",
    question: "Will the TA-125 index close above 2,500 in Q2 2026?",
    category: "Finance",
    yesPrice: 54,
    volume: 97800,
    daysLeft: 71,
    aiGenerated: true,
    trending: false,
    change: 2.7,
    resolveDate: "Jun 30, 2026",
    traders: 634,
    liquidity: 18000,
    description:
      "Resolves YES if the Tel Aviv Stock Exchange TA-125 index closes above 2,500 on any trading day before June 30, 2026.",
  },
  {
    id: "4",
    question: "Will OpenAI release GPT-5 before Anthropic releases Claude 4?",
    category: "Tech",
    yesPrice: 38,
    volume: 428100,
    daysLeft: 88,
    aiGenerated: false,
    trending: true,
    change: 12.0,
    resolveDate: "Jul 31, 2026",
    traders: 3421,
    liquidity: 87000,
    description:
      "Resolves YES if OpenAI officially releases GPT-5 to the public before Anthropic releases Claude 4.",
  },
  {
    id: "5",
    question: "Will Ethereum ETF spot inflows exceed $1B in May 2026?",
    category: "Crypto",
    yesPrice: 72,
    volume: 203400,
    daysLeft: 9,
    aiGenerated: true,
    trending: false,
    change: 19.4,
    resolveDate: "May 31, 2026",
    traders: 1892,
    liquidity: 41000,
    description:
      "Resolves YES if cumulative US Ethereum spot ETF net inflows exceed $1 billion during May 2026.",
  },
  {
    id: "6",
    question: "Will Israel sign a tech trade agreement with UAE before end of 2026?",
    category: "Geopolitics",
    yesPrice: 58,
    volume: 76400,
    daysLeft: 254,
    aiGenerated: true,
    trending: false,
    change: 1.3,
    resolveDate: "Dec 31, 2026",
    traders: 421,
    liquidity: 12000,
    description:
      "Resolves YES if Israel and UAE sign a formal bilateral tech/innovation trade agreement before December 31, 2026.",
  },
  {
    id: "7",
    question: "Will Bitcoin reach $200,000 before January 2027?",
    category: "Crypto",
    yesPrice: 31,
    volume: 891200,
    daysLeft: 254,
    aiGenerated: false,
    trending: true,
    change: -2.8,
    resolveDate: "Dec 31, 2026",
    traders: 8912,
    liquidity: 210000,
    description:
      "Resolves YES if Bitcoin's USD price on any major exchange reaches $200,000 before January 1, 2027.",
  },
  {
    id: "8",
    question: "Will Maccabi Tel Aviv win the EuroLeague 2025-26 season?",
    category: "Sports",
    yesPrice: 22,
    volume: 54300,
    daysLeft: 17,
    aiGenerated: true,
    trending: false,
    change: 6.1,
    resolveDate: "May 22, 2026",
    traders: 923,
    liquidity: 9800,
    description:
      "Resolves YES if Maccabi Tel Aviv wins the 2025-26 EuroLeague Final Four championship.",
  },
  {
    id: "9",
    question: "Will the Bank of Israel cut interest rates in the June 2026 meeting?",
    category: "Finance",
    yesPrice: 73,
    volume: 42100,
    daysLeft: 52,
    aiGenerated: true,
    trending: true,
    change: 3.8,
    resolveDate: "Jun 20, 2026",
    traders: 521,
    liquidity: 8400,
    description:
      "Resolves YES if the Bank of Israel's Monetary Committee announces a rate cut at the June 2026 meeting.",
  },
  {
    id: "10",
    question: "Will Waze release a major UI redesign in 2026?",
    category: "Tech",
    yesPrice: 28,
    volume: 18200,
    daysLeft: 254,
    aiGenerated: true,
    trending: false,
    change: -1.2,
    resolveDate: "Dec 31, 2026",
    traders: 287,
    liquidity: 3200,
    description:
      "Resolves YES if Waze releases a significant visual overhaul acknowledged in official communications in 2026.",
  },
  {
    id: "11",
    question: "Will the Israeli shekel breach 4.00 per USD in May 2026?",
    category: "Finance",
    yesPrice: 61,
    volume: 29300,
    daysLeft: 9,
    aiGenerated: true,
    trending: true,
    change: 7.2,
    resolveDate: "May 31, 2026",
    traders: 412,
    liquidity: 6100,
    description: "Resolves YES if USD/ILS spot rate closes above 4.00 on any day in May 2026.",
  },
  {
    id: "12",
    question: "Will the Israeli Supreme Court's Haredi draft ruling stand through June 2026?",
    category: "Politics",
    yesPrice: 44,
    volume: 38700,
    daysLeft: 61,
    aiGenerated: true,
    trending: false,
    change: -0.9,
    resolveDate: "Jun 30, 2026",
    traders: 689,
    liquidity: 7200,
    description:
      "Resolves YES if the Supreme Court ruling on mandatory Haredi military service remains in legal effect through June 30, 2026.",
  },
];

// ─── Positions ────────────────────────────────────────────────────────────────

export const POSITIONS: Position[] = [
  {
    id: "p1",
    marketId: "1",
    question: "Will Netanyahu call snap elections before August 2026?",
    side: "YES",
    shares: 420,
    entryPrice: 0.59,
    currentPrice: 0.67,
    category: "Politics",
    resolveDate: "Jul 31, 2026",
    status: "open",
  },
  {
    id: "p2",
    marketId: "4",
    question: "Will OpenAI release GPT-5 before Anthropic releases Claude 4?",
    side: "NO",
    shares: 250,
    entryPrice: 0.7,
    currentPrice: 0.62,
    category: "Tech",
    resolveDate: "Jul 31, 2026",
    status: "open",
  },
  {
    id: "p3",
    marketId: "5",
    question: "Will Ethereum ETF spot inflows exceed $1B in May 2026?",
    side: "YES",
    shares: 180,
    entryPrice: 0.53,
    currentPrice: 0.72,
    category: "Crypto",
    resolveDate: "May 31, 2026",
    status: "open",
  },
  {
    id: "p4",
    marketId: "7",
    question: "Will Bitcoin reach $200,000 before January 2027?",
    side: "NO",
    shares: 300,
    entryPrice: 0.72,
    currentPrice: 0.69,
    category: "Crypto",
    resolveDate: "Dec 31, 2026",
    status: "open",
  },
];

// ─── AI-Generated history ─────────────────────────────────────────────────────

export const GENERATED_HISTORY: GeneratedMarketHistory[] = [
  {
    id: "g1",
    question: "Will the Bank of Israel cut interest rates in the June 2026 meeting?",
    category: "Finance",
    yesPrice: 73,
    volume: 42100,
    published: true,
    createdAt: "2 hours ago",
    topic: "Bank of Israel rate decision June",
  },
  {
    id: "g2",
    question: "Will Waze release a major UI redesign in 2026?",
    category: "Tech",
    yesPrice: 28,
    volume: 0,
    published: false,
    createdAt: "Yesterday",
    topic: "Waze redesign 2026",
  },
  {
    id: "g3",
    question: "Will the Israeli shekel breach 4.00 per USD in May 2026?",
    category: "Finance",
    yesPrice: 61,
    volume: 18400,
    published: true,
    createdAt: "3 days ago",
    topic: "USD/ILS exchange rate",
  },
  {
    id: "g4",
    question: "Will Israel's Supreme Court ruling on Haredi draft stand by June 2026?",
    category: "Politics",
    yesPrice: 44,
    volume: 9800,
    published: true,
    createdAt: "5 days ago",
    topic: "Haredi draft law Israel",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const fmtVol = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;
