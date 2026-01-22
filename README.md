# Financial Hub

Um template moderno e pronto para produção para construir aplicações React full-stack usando React Router.

## Recursos

- 🚀 Renderização no lado do servidor (SSR)
- ⚡️ Hot Module Replacement (HMR)
- 📦 Empacotamento e otimização de assets
- 🔄 Carregamento de dados e mutações
- 🔒 TypeScript por padrão
- 🎉 TailwindCSS para estilização
- ☁️ Integração com Cloudflare Workers
- 📖 [Documentação do React Router](https://reactrouter.com/)

## Primeiros Passos

### Instalação

Instale as dependências:

```bash
npm install
Desenvolvimento
Temos dois modos de desenvolvimento disponíveis, dependendo da sua necessidade:

1. Modo Padrão (Recomendado para UI/Lógica)
Executa o servidor de desenvolvimento padrão do React Router (Node.js). Use este modo para a maior parte do desenvolvimento diário (layouts, componentes, rotas padrão), pois é mais rápido e evita conflitos de ambiente.

Bash

npm run dev
Acesse em: http://localhost:5173

2. Modo de Integração Cloudflare
Executa o servidor de desenvolvimento com o Proxy do Cloudflare ativado. Use este modo apenas quando precisar testar recursos específicos do Cloudflare localmente (Bindings, KV, D1, Headers).

Bash

npm run dev:cf
Nota: Requer a configuração do cross-env no package.json.

Build para Produção
Crie uma build de produção:

Bash

npm run build
Deploy
Deploy na Cloudflare
Faça o deploy para o Cloudflare Workers usando o Wrangler:

Bash

npx wrangler deploy
Deploy com Docker
Para construir e rodar usando Docker:

Bash

docker build -t financial-hub .

# Rodar o contêiner
docker run -p 3000:3000 financial-hub
Estilização
Este template já vem com o Tailwind CSS configurado.

Feito com ❤️ usando React Router & Cloudflare.