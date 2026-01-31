// app/routes.ts
import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),

  // === APLICAÇÃO PRINCIPAL (MOTORISTA) ===
  layout("routes/_app.tsx", [
    index("routes/dashboard.tsx"),
    route("ganhos", "routes/ganhos.tsx"),
    route("despesas", "routes/despesas.tsx"),
    route("veiculos", "routes/veiculos.tsx"),
    route("timeline", "routes/timeline.tsx"),
    route("metas", "routes/metas.tsx"),
    
    // === ROTAS DE PERFIL ===
    route("perfil", "routes/perfil.tsx"), // Página principal do perfil
    route("perfil/dados", "routes/perfil.dados.tsx"), // Editar dados
    route("perfil/senha", "routes/perfil.senha.tsx"), // Alterar senha
    route("perfil/preferencias", "routes/perfil.preferencias.tsx"), // Configurações
    route("perfil/suporte", "routes/perfil.suporte.tsx"), // Ajuda
  ]),

  // === ÁREA ADMINISTRATIVA (NOVO) ===
  layout("routes/admin.tsx", [
    route("admin", "routes/admin.dashboard.tsx"), // Dashboard (admin/)
    route("admin/users", "routes/admin.users.tsx"), // Gestão de Usuários
    route("admin/financials", "routes/admin.financials.tsx"), // Métricas Financeiras
  ]),

] satisfies RouteConfig;