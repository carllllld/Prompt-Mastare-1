import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieBanner from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy } from "react";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF7" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2D6A4F", borderTopColor: "transparent" }} />
        <span className="text-sm" style={{ color: "#6B7280" }}>Laddar...</span>
      </div>
    </div>
  );
}

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
        <Suspense fallback={<PageSpinner />}>
          <Home />
        </Suspense>
      </Route>
      <Route path="/teams">
        <Suspense fallback={<PageSpinner />}>
          <Teams />
        </Suspense>
      </Route>
      <Route path="/teams/join/:token">
        <Suspense fallback={<PageSpinner />}>
          <JoinTeam />
        </Suspense>
      </Route>
      <Route path="/prompts/:id">
        <Suspense fallback={<PageSpinner />}>
          <PromptEditor />
        </Suspense>
      </Route>
      <Route path="/history">
        <Suspense fallback={<PageSpinner />}>
          <HistoryPage />
        </Suspense>
      </Route>
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy">
        <Suspense fallback={<PageSpinner />}>
          <PrivacyPolicy />
        </Suspense>
      </Route>
      <Route path="/terms">
        <Suspense fallback={<PageSpinner />}>
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
        <ErrorBoundary>
          <Toaster />
          <Router />
          <CookieBanner />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
