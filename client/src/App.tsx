import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MobileMvp from "@/pages/mobile-mvp";
import AgentPortal from "@/pages/agent-portal";
import AgentOnboarding from "@/pages/agent-onboarding";
import AdminConsole from "@/pages/admin-console";
import { BrokerProfilePage, DirectoryPage, LoginPage, PublicHome, QuotesPage } from "@/pages/website";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/directory" component={DirectoryPage} />
      <Route path="/brokers/:slug" component={BrokerProfilePage} />
      <Route path="/login/consumer">{() => <LoginPage role="consumer" />}</Route>
      <Route path="/login/agent">{() => <LoginPage role="agent" />}</Route>
      <Route path="/login/admin">{() => <LoginPage role="admin" />}</Route>
      <Route path="/app" component={MobileMvp} />
      <Route path="/agent" component={AgentPortal} />
      <Route path="/agent/onboarding" component={AgentOnboarding} />
      <Route path="/admin" component={AdminConsole} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
