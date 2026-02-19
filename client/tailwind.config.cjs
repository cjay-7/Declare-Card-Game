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
      animation: {
        cardDraw: "cardDraw 0.5s ease-out forwards",
        cardDiscard: "cardDiscard 0.5s ease-in forwards",
        cardSwap: "cardSwap 0.8s ease-in-out forwards",
        cardReveal: "cardReveal 0.4s ease-out forwards",
        slideIn: "slideIn 0.3s ease-out forwards",
      },
      keyframes: {
        cardDraw: {
          "0%": {
            transform: "translateY(-100px) scale(0.8) rotate(-5deg)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0) scale(1) rotate(0)",
            opacity: "1",
          },
        },
        cardDiscard: {
          "0%": { transform: "translateY(0) scale(1) rotate(0)", opacity: "1" },
          "100%": {
            transform: "translateY(20px) scale(0.8) rotate(5deg)",
            opacity: "0",
          },
        },
        cardSwap: {
          "0%": { transform: "translateX(0) scale(1)" },
          "50%": { transform: "translateX(50px) scale(1.1)" },
          "100%": { transform: "translateX(0) scale(1)" },
        },
        cardReveal: {
          "0%": { transform: "rotateY(90deg)", opacity: "0.5" },
          "100%": { transform: "rotateY(0)", opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [
    mtConfig({
      darkColors: {
        primary: { default: "#f59e0b", dark: "#d97706", light: "#fbbf24", foreground: "#1a1a1a" },
        secondary: { default: "#6b7280", dark: "#4b5563", light: "#9ca3af", foreground: "#ffffff" },
        success: { default: "#22c55e", dark: "#16a34a", light: "#4ade80", foreground: "#ffffff" },
        error: { default: "#f87171", dark: "#ef4444", light: "#fca5a5", foreground: "#ffffff" },
      },
    }),
  ],
};
