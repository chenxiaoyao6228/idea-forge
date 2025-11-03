// import "./lib/sentry-intrument";
import { createRoot } from "react-dom/client";
import "@idea/ui/styles";
import "./index.css";
import "katex/dist/katex.min.css";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import AppWithInspector from "./components/react-dev-inspector";
import router from "./router";
import { createReactTreeMounter, createMountPoint } from "react-confirm";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import { Toaster } from "@idea/ui/shadcn/ui/sonner";
const mounter = createReactTreeMounter();
export const MountPoint = createMountPoint(mounter);

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <>
    <I18nextProvider i18n={i18n}>
      <AppWithInspector>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </AppWithInspector>
    </I18nextProvider>
    <MountPoint />
  </>,
  // </StrictMode>,
);
