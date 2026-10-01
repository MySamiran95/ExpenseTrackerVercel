import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeProvider } from "@/components/theme";
import { THEME_BOOT } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Keep";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const u = await Promise.race([
      getSessionUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    return u ? { id: u.id, email: u.email } : null;
  } catch {
    return null;
  }
});

function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await fetchSessionUser() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Keep expenses crystal clear — family tracking, budgets, and 24-month spending insights in rupees.",
      },
      { name: "theme-color", content: "#F3EEE6" },
      { name: "color-scheme", content: "light dark" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Outfit:wght@400;500;600;700&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <HeadContent />
      </head>
      <body className="font-sans">
        <PreviewHostBridge />
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider>
              <Outlet />
              <Toaster
                position="top-center"
                toastOptions={{
                  className: "font-sans",
                  style: {
                    background: "var(--color-night-2)",
                    color: "var(--color-on-night)",
                    border: "none",
                  },
                }}
              />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
