import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),

  layout("routes/_app.tsx", [
    index("routes/dashboard.tsx"),
    route("ganhos", "routes/ganhos.tsx"),
    route("despesas", "routes/despesas.tsx"),
    route("veiculos", "routes/veiculos.tsx"),
    // Adicione esta linha:
    route("timeline", "routes/timeline.tsx"),
    route("metas", "routes/metas.tsx"), 
  ]),

] satisfies RouteConfig;