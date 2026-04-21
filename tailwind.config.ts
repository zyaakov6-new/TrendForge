import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Default sans = Oxanium (display/headings/UI)
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
        // Explicit display class for titles
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        // Mono for numbers, addresses, data
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        background: "#03030a",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
