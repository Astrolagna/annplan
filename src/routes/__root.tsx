import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-serif text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-serif text-foreground">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Похоже, такого пути в этом календаре нет.
        </p>
        <div className="mt-6">
          <a
            href="/app"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Джйотиш-планер" },
      { name: "description", content: "Личный планер по ведической астрологии (Джйотиш) — месяц, неделя и день в одном уютном пространстве." },
      { property: "og:title", content: "Джйотиш-планер" },
      { name: "twitter:title", content: "Джйотиш-планер" },
      { property: "og:description", content: "Личный планер по ведической астрологии (Джйотиш) — месяц, неделя и день в одном уютном пространстве." },
      { name: "twitter:description", content: "Личный планер по ведической астрологии (Джйотиш) — месяц, неделя и день в одном уютном пространстве." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f3cc7d0d-7777-495c-b243-88d753cc1a49/id-preview-286b649c--5db41205-1fb8-4434-a59c-d7e31d5c7118.lovable.app-1776862169559.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f3cc7d0d-7777-495c-b243-88d753cc1a49/id-preview-286b649c--5db41205-1fb8-4434-a59c-d7e31d5c7118.lovable.app-1776862169559.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
