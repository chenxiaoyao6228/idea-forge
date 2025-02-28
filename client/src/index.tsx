import "./lib/sentry-intrument";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/providers/theme-provider";
import AppWithInspector from "./components/react-dev-inspector";
import router from "./router";
import { Toaster } from "./components/ui/toaster";
import { QueryProvider } from "./components/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <QueryProvider>
    <I18nextProvider i18n={i18n}>
      <AppWithInspector>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </AppWithInspector>
    </I18nextProvider>
  </QueryProvider>,
  // </StrictMode>,
);
