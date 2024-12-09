import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/providers/theme-provider";
import AppWithInspector from "./components/react-dev-inspector";

import router from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWithInspector>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </AppWithInspector>
  </StrictMode>,
);
