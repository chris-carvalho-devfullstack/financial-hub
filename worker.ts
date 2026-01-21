import { createRequestHandler } from "react-router";

import * as build from "virtual:react-router/server-build";

const requestHandler = createRequestHandler(build);

export default {
  fetch(request: Request, env: any, ctx: any) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
};