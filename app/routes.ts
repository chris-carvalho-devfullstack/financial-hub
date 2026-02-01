// app/routes.ts
import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),

  // === APLICAÇÃO PRINCIPAL (MOTORISTA) ===
  layout("routes/_app.tsx", [
    // Rota explícita "/dashboard"
    route("dashboard", "routes/dashboard.tsx"),
    
    // Rota raiz "/" (Index) - ADICIONAMOS { id: "app-index" } PARA EVITAR DUPLICIDADE
    index("routes/dashboard.tsx", { id: "app-index" }),

    route("ganhos", "routes/ganhos.tsx"),
    route("despesas", "routes/despesas.tsx"),
    route("veiculos", "routes/veiculos.tsx"),
    route("timeline", "routes/timeline.tsx"),
    route("metas", "routes/metas.tsx"),
    
    // === ROTAS DE PERFIL ===
    route("perfil", "routes/perfil.tsx"), 
    route("perfil/dados", "routes/perfil.dados.tsx"), 
    route("perfil/senha", "routes/perfil.senha.tsx"), 
    route("perfil/preferencias", "routes/perfil.preferencias.tsx"), 
    route("perfil/suporte", "routes/perfil.suporte.tsx"), 
  ]),

  // === ÁREA ADMINISTRATIVA ===
  layout("routes/admin.tsx", [
    route("admin", "routes/admin.dashboard.tsx"), 
    route("admin/users", "routes/admin.users.tsx"), 
    route("admin/financials", "routes/admin.financials.tsx"), 
  ]),

] satisfies RouteConfig;