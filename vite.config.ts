import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  plugins: [
    // Carrega o plugin do Cloudflare APENAS em desenvolvimento
    mode === 'development' && cloudflare({ configPath: "./wrangler.toml" }),
    reactRouter(),
    tsconfigPaths(),
  ].filter(Boolean), // Remove os itens 'false' da lista
}));