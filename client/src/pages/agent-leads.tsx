import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Inbox, Mail, PhoneCall, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LandingLead } from "@shared/schema";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-10 w-10 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold leading-none">PolicyQuoters</p>
        <p className="text-xs text-muted-foreground">Landing page leads</p>
      </div>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function premium(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default function AgentLeads() {
  const { data: leads = [], isLoading } = useQuery<LandingLead[]>({ queryKey: ["/api/agent/leads"] });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-full"><Link href="/agent">Task inbox</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link href="/agent/onboarding">Agent setup</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link href="/admin/landing-pages">Landing pages</Link></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <section className="mb-5 rounded-3xl border border-border bg-card/86 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">Landing page leads</Badge>
              <h1 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Consumer leads from your landing pages</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                When a consumer selects a quote on one of your landing pages, the lead appears here with their contact info and the carrier they chose.
              </p>
            </div>
            <div className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{leads.length}</span> total lead{leads.length === 1 ? "" : "s"}
            </div>
          </div>
        </section>

        {isLoading ? (
          <Card><CardContent className="p-5 text-sm text-muted-foreground">Loading leads...</CardContent></Card>
        ) : null}

        {!isLoading && leads.length === 0 ? (
          <Card><CardContent className="flex flex-col items-start gap-2 p-5 text-sm text-muted-foreground">
            <Inbox className="h-5 w-5 text-primary" />
            <p>No leads yet. Share a landing page URL from the admin builder to start collecting consumer interest.</p>
          </CardContent></Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {leads.map((lead) => (
            <Card key={lead.id} data-testid={`card-agent-lead-${lead.id}`}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {lead.contact.firstName} {lead.contact.lastName}
                  <Badge variant="outline" className="rounded-full text-xs">{lead.status}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">From: {lead.landingPageName} · /lp/{lead.landingPageSlug}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <a className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm" href={`tel:${lead.contact.phone}`} data-testid={`link-call-${lead.id}`}>
                    <PhoneCall className="h-4 w-4 text-primary" />
                    <span>{lead.contact.phone}</span>
                  </a>
                  <a className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm" href={`mailto:${lead.contact.email}`} data-testid={`link-email-${lead.id}`}>
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="truncate">{lead.contact.email}</span>
                  </a>
                </div>

                <div className="rounded-xl bg-muted p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Consumer answers</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5">
                    <li>State: <span className="font-medium text-foreground">{lead.answers.state}</span></li>
                    <li>Age: <span className="font-medium text-foreground">{lead.answers.age}</span> ({lead.answers.gender})</li>
                    <li>Coverage: <span className="font-medium text-foreground">{money(lead.answers.coverageAmount)}</span></li>
                    <li>Tobacco: <span className="font-medium text-foreground">{lead.answers.smoker ? "Yes" : "No"}</span></li>
                    <li>Health: <span className="font-medium text-foreground">{lead.answers.health}</span></li>
                  </ul>
                </div>

                {lead.selectedQuote ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Selected quote</p>
                    <p className="mt-2 font-semibold">{lead.selectedQuote.carrierName} · {lead.selectedQuote.productName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {premium(lead.selectedQuote.monthlyPremium)}/mo · {money(lead.selectedQuote.coverageAmount)} coverage · {lead.selectedQuote.termLength}-year term
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No quote selected yet.</p>
                )}

                <p className="text-xs text-muted-foreground">Submitted {new Date(lead.createdAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
