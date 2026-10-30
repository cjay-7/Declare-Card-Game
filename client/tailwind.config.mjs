import { mtConfig } from "@material-tailwind/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@material-tailwind/react/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface": "var(--surface)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        "primary-container": "var(--primary-container)",
        "outline": "var(--outline)",
        "success-fg": "var(--success)",
        "success-strong": "var(--success-strong)",
        "success-strong-hover": "var(--success-strong-hover)",
        "success-container": "var(--success-container)",
        "error-fg": "var(--error)",
        "error-strong": "var(--error-strong)",
        "error-strong-hover": "var(--error-strong-hover)",
        "error-container": "var(--error-container)",
        "warning": "var(--warning)",
        "warning-strong": "var(--warning-strong)",
        "info": "var(--info)",
        "info-strong": "var(--info-strong)",
        "info-strong-hover": "var(--info-strong-hover)",
        "info-container": "var(--info-container)",
        "power": "var(--power)",
        "power-strong": "var(--power-strong)",
        "power-strong-hover": "var(--power-strong-hover)",
      },
    },
  },
  plugins: [
    mtConfig({
      colors: {
        primary: { default: "#f59e0b", dark: "#d97706", light: "#fbbf24", foreground: "#1a1a1a" },
        secondary: { default: "#6b7280", dark: "#4b5563", light: "#9ca3af", foreground: "#ffffff" },
        success: { default: "#15803d", dark: "#166534", light: "#4ade80", foreground: "#ffffff" },
        error: { default: "#dc2626", dark: "#b91c1c", light: "#fca5a5", foreground: "#ffffff" },
      },
      darkColors: {
        primary: { default: "#f59e0b", dark: "#d97706", light: "#fbbf24", foreground: "#1a1a1a" },
        secondary: { default: "#6b7280", dark: "#4b5563", light: "#9ca3af", foreground: "#ffffff" },
        success: { default: "#15803d", dark: "#166534", light: "#4ade80", foreground: "#ffffff" },
        error: { default: "#f87171", dark: "#ef4444", light: "#fca5a5", foreground: "#ffffff" },
      },
    }),
  ],
};
