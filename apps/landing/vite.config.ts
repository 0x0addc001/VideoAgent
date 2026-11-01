import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  publicDir: fileURLToPath(new URL("../../site", import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL("../../.pages-build", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
