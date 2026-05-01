import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MobileMvp from "@/pages/mobile-mvp";
import AgentPortal from "@/pages/agent-portal";
import AgentOnboarding from "@/pages/agent-onboarding";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={MobileMvp} />
      <Route path="/agent" component={AgentPortal} />
      <Route path="/agent/onboarding" component={AgentOnboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
