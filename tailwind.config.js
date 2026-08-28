/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted-foreground) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        popover: "rgb(var(--popover) / <alpha-value>)",
        "popover-inner": "rgb(var(--popover-inner) / <alpha-value>)",

        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",

        secondary: "transparent",
        "secondary-border": "rgb(var(--secondary-border) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--secondary-foreground) / <alpha-value>)",
        "secondary-hover": "rgb(var(--secondary-hover) / <alpha-value>)",
        "secondary-active": "rgb(var(--secondary-active) / <alpha-value>)",

        selected: "rgb(var(--selected) / <alpha-value>)",
        "selected-hover": "rgb(var(--selected-hover) / <alpha-value>)",

        success: "rgb(var(--success) / <alpha-value>)",
        "success-bg": "rgb(var(--success-bg) / <alpha-value>)",
        error: "rgb(var(--error) / <alpha-value>)",
        "error-bg": "rgb(var(--error-bg) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        "warning-bg": "rgb(var(--warning-bg) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        "info-bg": "rgb(var(--info-bg) / <alpha-value>)",

        ring: "rgb(var(--ring) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"],
        mono: ["var(--font-mono)"]
      },
      fontSize: {
        big: ["1.25rem", { lineHeight: "1.2" }]
      },
      fontWeight: {
        small: "300",
        regular: "400",
        big: "600"
      },
      borderRadius: {
        lg: "8px",
        "2xl": "16px"
      },
      boxShadow: {
        popover: "0 4px 16px 0 rgb(15 15 20 / 0.08)"
      }
    }
  },
  plugins: []
};
