import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        luxury: {
          green: "#0B1F1A",
          "green-secondary": "#0F2318",
          "green-card": "#112920",
          gold: "#D4AF37",
          "gold-hover": "#B89320",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        serif: ["var(--font-playfair)", "serif"],
        rampart: ["var(--font-rampart)", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
