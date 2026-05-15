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
        ink: "#2f3846",
        muted: "#657080",
        panel: "#f7f8fa",
        line: "#cbd2dc",
        accent: "#0e4e96",
        leaf: "#187f64",
        amber: "#c76a14",
        berry: "#9b2f5b"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(47, 56, 70, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
