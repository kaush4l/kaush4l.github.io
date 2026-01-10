import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/toaster";
import { fetcher } from "./lib/fetcher";
import { ResumeView } from "./pages/ResumeView";
import { ThemeProvider } from "./components/theme/ThemeProvider";

import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <SWRConfig value={{ fetcher }}>
        <div className="min-h-screen bg-background font-sans antialiased">
          <Switch>
            <Route path="/" component={ResumeView} />
            <Route path="/:section" component={ResumeView} />
            <Route>404 Page Not Found</Route>
          </Switch>
        </div>
        <Toaster />
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>
);
