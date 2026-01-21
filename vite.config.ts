import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild, mode }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: "./worker.ts", // <--- Aponta para o nosso novo worker manual
        }
      : undefined,
  },
  plugins: [
    mode === 'development' && cloudflare({ configPath: "./wrangler.toml" }),
    reactRouter(),
    tsconfigPaths(),
  ].filter(Boolean),
}));