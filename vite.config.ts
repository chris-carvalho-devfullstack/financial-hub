import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin"; // <--- AGORA ESTÁ CERTO (Do pacote oficial)
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare(),
    reactRouter(),
    tsconfigPaths(),
  ],
});