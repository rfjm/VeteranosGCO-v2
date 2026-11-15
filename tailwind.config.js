/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      colors: {
        // GCO green, taken from the club crest.
        brand: {
          50: "#ecfdf3",
          100: "#d1fae1",
          200: "#a6f3c6",
          300: "#6be5a4",
          400: "#33cf7f",
          500: "#12b465",
          600: "#079150",
          700: "#087443",
          800: "#0b5c38",
          900: "#0b4b30",
          950: "#022a1a",
        },
        ink: {
          50: "#f3f6f4",
          100: "#e2e8e4",
          200: "#c5d0c9",
          300: "#9fafa5",
          400: "#76887d",
          500: "#5a6b61",
          600: "#46544c",
          700: "#323d37",
          800: "#1f2723",
          850: "#171e1a",
          900: "#111713",
          950: "#0a0f0c",
        },
        bib: {
          yellow: "#f5ff00",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["'Barlow Condensed'", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(51,207,127,0.35), 0 8px 30px -8px rgba(18,180,101,0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 220ms ease-out both",
        "scale-in": "scale-in 160ms ease-out both",
      },
    },
  },
  plugins: [],
};
