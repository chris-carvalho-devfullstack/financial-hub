// app/root.tsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        {/* Ajuste de Viewport para Mobile (evita zoom indesejado e escala correta) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        
        {/* Cor da barra de status do navegador no celular */}
        <meta name="theme-color" content="#030712" />
        
        {/* Link para o Manifesto PWA (Identidade do App) */}
        <link rel="manifest" href="/manifest.json" />
        
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// Tratamento de erros
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto text-white">
      <h1 className="text-2xl font-bold text-red-500 mb-2">{message}</h1>
      <p className="text-gray-300">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto bg-gray-900 rounded mt-4 border border-gray-800 text-sm font-mono">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}