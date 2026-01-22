import { createRequestHandler } from "react-router";

import * as build from "virtual:react-router/server-build";

const requestHandler = createRequestHandler(build);

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    // Verifica se a requisição é para um arquivo estático (começa com /assets/ ou tem extensão conhecida)
    // Se for, pede para o Cloudflare servir o arquivo diretamente (env.ASSETS)
    if (
      url.pathname.startsWith("/assets/") ||
      url.pathname.match(/\.(ico|json|png|jpg|jpeg|svg|css|js|txt|map|woff2?)$/)
    ) {
      return env.ASSETS.fetch(request);
    }

    // Para todas as outras requisições (rotas da aplicação), usa o React Router (SSR)
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
};