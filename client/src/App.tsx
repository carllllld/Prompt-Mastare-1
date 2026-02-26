import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieBanner from "@/components/CookieBanner";
import { Suspense, lazy } from "react";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";

// Lazy load pages for code splitting
const Home = lazy(() => import("@/pages/Home"));
const Teams = lazy(() => import("@/pages/Teams"));
const PromptEditor = lazy(() => import("@/pages/PromptEditor"));
const JoinTeam = lazy(() => import("@/pages/JoinTeam"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Terms = lazy(() => import("@/pages/Terms"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app">
        <Suspense fallback={<div>Laddar...</div>}>
          <Home />
        </Suspense>
      </Route>
      <Route path="/teams">
        <Suspense fallback={<div>Laddar...</div>}>
          <Teams />
        </Suspense>
      </Route>
      <Route path="/teams/join/:token">
        <Suspense fallback={<div>Laddar...</div>}>
          <JoinTeam />
        </Suspense>
      </Route>
      <Route path="/prompts/:id">
        <Suspense fallback={<div>Laddar...</div>}>
          <PromptEditor />
        </Suspense>
      </Route>
      <Route path="/history">
        <Suspense fallback={<div>Laddar...</div>}>
          <HistoryPage />
        </Suspense>
      </Route>
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy">
        <Suspense fallback={<div>Laddar...</div>}>
          <PrivacyPolicy />
        </Suspense>
      </Route>
      <Route path="/terms">
        <Suspense fallback={<div>Laddar...</div>}>
          <Terms />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <CookieBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
