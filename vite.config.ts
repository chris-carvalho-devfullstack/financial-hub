import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@react-router/cloudflare/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare(), // <--- Essa é a peça chave para funcionar na Cloudflare
    reactRouter(),
    tsconfigPaths(),
  ],
});