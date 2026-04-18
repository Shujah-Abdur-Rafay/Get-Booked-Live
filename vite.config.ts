import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const resolveFromRoot = (target: string) => path.resolve(rootDir, target);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolveFromRoot("./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router",
      "react-router-dom",
      "@tanstack/react-query",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "react-router",
      "react-router-dom",
      "@tanstack/react-query",
      "framer-motion",
      "react-hot-toast",
      "react-helmet-async",
      "sonner",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "lucide-react",
      "recharts",
    ],
    force: true,
  },
}));
