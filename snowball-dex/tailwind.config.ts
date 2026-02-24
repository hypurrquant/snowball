import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0A0B14",
        "bg-card": "#141525",
        "bg-input": "#1C1D30",
        "accent-primary": "#60A5FA",
        "text-primary": "#F5F5F7",
        "text-secondary": "#8B8D97",
        "text-tertiary": "#4A4B57",
        success: "#34D399",
        warning: "#FBBF24",
        error: "#F87171",
        border: "#1F2037",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
