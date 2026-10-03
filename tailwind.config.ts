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
        axiom: {
          bg: "#F5F5F0",
          paper: "#FBFBF8",
          surface: "#EFEFE8",
          ink: "#141413",
          muted: "#6E6E68",
          line: "#DCDCD3",
          softline: "#E8E8E0",
          blue: "#3B52F6",
          bluesoft: "#E9ECFF",
          green: "#1F8A5C",
          greensoft: "#E5F5ED",
          red: "#D6453A",
          redsoft: "#FCECEB",
          amber: "#C88A1E",
          ambersoft: "#FDF4E3",
        },
      },
      fontFamily: {
        display: ["var(--font-space)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      boxShadow: {
        editorial: "0 20px 60px rgba(20, 20, 15, 0.06)",
        floating: "0 12px 36px rgba(20, 20, 15, 0.08)",
        subtle: "0 2px 10px rgba(20, 20, 15, 0.03)",
      },
    },
  },
  plugins: [],
};
export default config;
