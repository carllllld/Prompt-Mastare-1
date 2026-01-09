import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import SupportDashboard from "@/pages/SupportDashboard";
import AdminSettings from "@/pages/AdminSettings";
import CompanySetup from "@/pages/CompanySetup";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/support" component={SupportDashboard} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/setup" component={CompanySetup} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
