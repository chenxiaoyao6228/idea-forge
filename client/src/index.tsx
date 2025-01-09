import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/providers/theme-provider";
import AppWithInspector from "./components/react-dev-inspector";
import router from "./router";
import { Toaster } from "./components/ui/toaster";
import { QueryProvider } from "./components/react-query";

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <QueryProvider>
    <AppWithInspector>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </AppWithInspector>
  </QueryProvider>,
  // </StrictMode>,
);
