import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MobileMvp from "@/pages/mobile-mvp";
import AgentPortal from "@/pages/agent-portal";
import AgentOnboarding from "@/pages/agent-onboarding";
import AgentLeads from "@/pages/agent-leads";
import AdminConsole from "@/pages/admin-console";
import AdminLandingPages from "@/pages/admin-landing-pages";
import AdminCapturedContacts from "@/pages/admin-captured-contacts";
import LandingPageView from "@/pages/landing-page";
import { BrokerProfilePage, DirectoryPage, LoginPage, PrivacyPolicyPage, PublicHome, QuotesPage } from "@/pages/website";

function routerBase() {
  const path = window.location.pathname;
  const indexPath = "/index.html";
  if (!path.endsWith(indexPath)) return "";
  return path;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/directory" component={DirectoryPage} />
      <Route path="/brokers/:slug" component={BrokerProfilePage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/login/consumer">{() => <LoginPage role="consumer" />}</Route>
      <Route path="/login/agent">{() => <LoginPage role="agent" />}</Route>
      <Route path="/login/admin">{() => <LoginPage role="admin" />}</Route>
      <Route path="/app" component={MobileMvp} />
      <Route path="/agent" component={AgentPortal} />
      <Route path="/agent/onboarding" component={AgentOnboarding} />
      <Route path="/agent/leads" component={AgentLeads} />
      <Route path="/admin" component={AdminConsole} />
      <Route path="/admin/landing-pages" component={AdminLandingPages} />
      <Route path="/admin/captured-contacts" component={AdminCapturedContacts} />
      <Route path="/lp/:slug" component={LandingPageView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router base={routerBase()}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
