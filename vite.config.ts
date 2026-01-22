import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => {
  // Verifica se a flag foi passada pelo script "dev:cf"
  const isCloudflareDev = process.env.USE_CF === 'true';

  return {
    build: {
      rollupOptions: isSsrBuild
        ? {
            input: "./worker.ts",
          }
        : undefined,
    },
    plugins: [
      // Só ativa o plugin Cloudflare se a flag estiver true
      isCloudflareDev && cloudflare({ 
        configPath: "./wrangler.toml",
        viteEnvironment: { name: "ssr" }
      }),
      reactRouter(),
      tsconfigPaths(),
    ].filter(Boolean),
  };
});