import "./lib/sentry-intrument";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/providers/theme-provider";
import AppWithInspector from "./components/react-dev-inspector";
import router from "./router";
import { Toaster } from "./components/ui/toaster";
import { createConfirmationCreater, createReactTreeMounter, createMountPoint } from "react-confirm";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import { websocketService } from "./lib/websocket";
const mounter = createReactTreeMounter();
export const MountPoint = createMountPoint(mounter);

// FIXME: find the right time to connect to the realtime gateway
setTimeout(() => {
  websocketService.connect();
}, 2000);

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <>
    <I18nextProvider i18n={i18n}>
      <AppWithInspector>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </AppWithInspector>
    </I18nextProvider>
    <MountPoint />
  </>,
  // </StrictMode>,
);
