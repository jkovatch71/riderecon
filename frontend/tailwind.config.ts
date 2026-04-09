import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        status: {
          green: "#2e7d32",
          yellow: "#f9a825",
          red: "#c62828"
        }
      }
    }
  },
  plugins: []
};

export default config;
