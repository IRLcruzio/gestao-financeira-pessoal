import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fundo — carvão neutro quente, nunca preto puro
        bg: {
          DEFAULT: "#121115",
          surface: "#1A191E",
          raised: "#221F26",
          hover: "#2A2730",
        },
        border: {
          DEFAULT: "#2C2A31",
          subtle: "#211F25",
        },
        // Texto
        ink: {
          DEFAULT: "#EDEAE3",
          muted: "#A6A2A0",
          faint: "#6E6A6E",
        },
        // Dourado — cor de destaque única
        gold: {
          DEFAULT: "#C6A25D",
          bright: "#E4C583",
          dim: "#8A7241",
        },
        // Estados (usados com moderação)
        positive: "#7C9B7E",
        negative: "#B4614A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "10px",
        card: "14px",
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
    },
  },
  plugins: [],
};
export default config;
