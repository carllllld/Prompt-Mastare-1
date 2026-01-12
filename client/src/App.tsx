import { Switch, Route, Link, useLocation } from "wouter"; // [1] Lade till Link och useLocation
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { History, Home as HomeIcon } from "lucide-react"; // [2] Lade till ikoner
import Home from "@/pages/Home";
import Teams from "@/pages/Teams";
import PromptEditor from "@/pages/PromptEditor";
import JoinTeam from "@/pages/JoinTeam";
import NotFound from "@/pages/not-found";
import HistoryPage from "@/pages/HistoryPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/teams" component={Teams} />
      <Route path="/teams/join/:token" component={JoinTeam} />
      <Route path="/prompts/:id" component={PromptEditor} />
      <Route path="/history" component={HistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation(); // Håller koll på vilken sida vi är på

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* --- ENKEL NAVIGERING START --- */}
        <nav className="border-b bg-white p-4">
          <div className="container mx-auto flex gap-6">
            <Link href="/">
              <a className={`flex items-center gap-2 text-sm font-medium ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
                <HomeIcon className="h-4 w-4" />
                Hem
              </a>
            </Link>
            <Link href="/history">
              <a className={`flex items-center gap-2 text-sm font-medium ${location === "/history" ? "text-primary" : "text-muted-foreground"}`}>
                <History className="h-4 w-4" />
                Historik
              </a>
            </Link>
            <Link href="/teams">
              <a className={`flex items-center gap-2 text-sm font-medium ${location === "/teams" ? "text-primary" : "text-muted-foreground"}`}>
                Teams
              </a>
            </Link>
          </div>
        </nav>
        {/* --- ENKEL NAVIGERING SLUT --- */}

        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;