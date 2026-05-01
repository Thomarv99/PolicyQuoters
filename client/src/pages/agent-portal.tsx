import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileSignature,
  Handshake,
  Mail,
  PhoneCall,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentCase, AgentCaseStatus, AgentProfileReadiness } from "@shared/schema";

const acceptanceStatuses: AgentCaseStatus[] = ["available", "assigned"];
const activeStatuses: AgentCaseStatus[] = ["accepted", "contacted", "application-started", "submitted"];
const closedStatuses: AgentCaseStatus[] = ["issued", "declined", "not-placed"];

type NextAction = {
  headline: string;
  description: string;
  cta?: string;
  nextStatus?: AgentCaseStatus;
  secondaryCta?: string;
  secondaryStatus?: AgentCaseStatus;
  secondaryReason?: string;
  icon: LucideIcon;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function premium(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function isAcceptanceStatus(status: AgentCaseStatus) {
  return acceptanceStatuses.includes(status);
}

function isClosedStatus(status: AgentCaseStatus) {
  return closedStatuses.includes(status);
}

function statusLabel(status: AgentCaseStatus) {
  const labels: Record<AgentCaseStatus, string> = {
    available: "Needs decision",
    assigned: "Needs decision",
    accepted: "Accepted",
    contacted: "Customer called",
    "application-started": "eApp started",
    submitted: "Carrier review",
    issued: "Issued",
    declined: "Declined",
    "not-placed": "Not placed",
  };
  return labels[status];
}

function statusClass(status: AgentCaseStatus) {
  if (status === "issued") return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200";
  if (status === "declined" || status === "not-placed") return "bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-200";
  if (status === "assigned" || status === "available") return "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200";
  return "bg-primary/10 text-primary hover:bg-primary/10";
}

function actionForCase(agentCase: AgentCase): NextAction {
  const actions: Record<AgentCaseStatus, NextAction> = {
    available: {
      headline: "Accept or decline this assignment",
      description: "The customer already chose a quote and signed the packet. Accept only if you can contact them before the due time.",
      cta: "Accept assignment",
      nextStatus: "accepted",
      secondaryCta: "Decline",
      secondaryStatus: "declined",
      secondaryReason: "Agent declined before accepting the assignment.",
      icon: UserRoundCheck,
    },
    assigned: {
      headline: "Accept or decline this assignment",
      description: "The customer already chose a quote and signed the packet. Accept only if you can contact them before the due time.",
      cta: "Accept assignment",
      nextStatus: "accepted",
      secondaryCta: "Decline",
      secondaryStatus: "declined",
      secondaryReason: "Agent declined before accepting the assignment.",
      icon: UserRoundCheck,
    },
    accepted: {
      headline: "Call the customer",
      description: "Confirm the selected quote, answer any questions, and let them know the application packet is being prepared.",
      cta: "Mark customer called",
      nextStatus: "contacted",
      icon: PhoneCall,
    },
    contacted: {
      headline: "Open the carrier eApp",
      description: "Start the carrier application or FireLight packet using the selected quote and completed customer intake.",
      cta: "Start eApp",
      nextStatus: "application-started",
      icon: FileSignature,
    },
    "application-started": {
      headline: "Submit to the carrier",
      description: "Finish the application handoff, verify signatures, and submit the packet for carrier review.",
      cta: "Mark submitted",
      nextStatus: "submitted",
      icon: ArrowUpRight,
    },
    submitted: {
      headline: "Track carrier decision",
      description: "Carrier review is underway. Mark the case issued when the policy is approved, or not placed if it cannot proceed.",
      cta: "Mark issued",
      nextStatus: "issued",
      secondaryCta: "Mark not placed",
      secondaryStatus: "not-placed",
      secondaryReason: "Carrier or customer outcome prevented placement.",
      icon: Handshake,
    },
    issued: {
      headline: "Policy issued",
      description: "This assignment is complete. No additional agent action is needed in this demo workflow.",
      icon: CheckCircle2,
    },
    declined: {
      headline: "Assignment declined",
      description: "This case is closed for this agent and should be routed back to the assignment engine.",
      icon: XCircle,
    },
    "not-placed": {
      headline: "Policy not placed",
      description: "This case is closed without placement. The customer record can remain available for internal follow-up.",
      icon: XCircle,
    },
  };
  return actions[agentCase.status];
}

function caseRank(agentCase: AgentCase) {
  if (isAcceptanceStatus(agentCase.status)) return 0;
  if (activeStatuses.includes(agentCase.status)) return 1;
  if (agentCase.status === "issued") return 2;
  return 3;
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-10 w-10 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold leading-none">PolicyQuoters</p>
        <p className="text-xs text-muted-foreground">Agent task inbox</p>
      </div>
    </div>
  );
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <Card className="bg-card/90">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.03em]" data-testid={`metric-${title.toLowerCase().replaceAll(" ", "-")}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </CardContent>
    </Card>
  );
}

function ReadinessBanner({ readiness }: { readiness?: AgentProfileReadiness }) {
  if (!readiness) return null;

  return (
    <Card className={cn("mb-5", readiness.ready ? "border-primary/30 bg-primary/5" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40")}>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          {readiness.ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /> : <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />}
          <div>
            <p className="font-semibold">{readiness.ready ? "Agent ready for instant assignments" : "Agent setup is not complete"}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {readiness.ready
                ? "Licensing, appointments, payment method, and assignment-fee authorization are ready."
                : `${readiness.score}% complete. Finish setup before routing live paid assignments to this agent.`}
            </p>
            {!readiness.ready && readiness.missing.length ? <p className="mt-1 text-xs text-muted-foreground">Next: {readiness.missing[0]}</p> : null}
          </div>
        </div>
        <Button asChild variant={readiness.ready ? "outline" : "default"} className="rounded-full" data-testid="button-open-onboarding-banner">
          <Link href="/agent/onboarding">{readiness.ready ? "Review setup" : "Finish setup"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function QueueCard({
  agentCase,
  active,
  updating,
  onSelect,
  onStatus,
}: {
  agentCase: AgentCase;
  active: boolean;
  updating: boolean;
  onSelect: () => void;
  onStatus: (id: string, status: AgentCaseStatus, reason?: string) => void;
}) {
  const action = actionForCase(agentCase);
  const Icon = action.icon;

  return (
    <Card className={cn("bg-card/95 transition", active && "bg-primary/5 ring-2 ring-primary/30")} data-testid={`card-case-${agentCase.id}`}>
      <CardContent className="space-y-4 p-4">
        <button type="button" onClick={onSelect} className="w-full rounded-md text-left" data-testid={`button-view-${agentCase.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold" data-testid={`text-case-customer-${agentCase.id}`}>
                {agentCase.customer.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {agentCase.lineType} · {agentCase.customer.state} · {agentCase.carrierName}
              </p>
            </div>
            <Badge className={cn("rounded-full", statusClass(agentCase.status))}>{statusLabel(agentCase.status)}</Badge>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">{action.headline}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{agentCase.dueBy}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-background p-2">
              <p className="text-muted-foreground">Annual premium</p>
              <p className="mt-1 font-mono font-semibold">{premium(agentCase.annualPremium)}</p>
            </div>
            <div className="rounded-xl bg-background p-2">
              <p className="text-muted-foreground">Assignment fee</p>
              <p className="mt-1 font-mono font-semibold" data-testid={`text-card-assignment-fee-${agentCase.id}`}>
                {money(agentCase.assignmentFee)}
              </p>
            </div>
            <div className="rounded-xl bg-background p-2">
              <p className="text-muted-foreground">AM Best</p>
              <p className="mt-1 font-mono font-semibold">{agentCase.amBestRating}</p>
            </div>
          </div>
        </button>
        <div className="flex flex-wrap gap-2">
          {action.nextStatus ? (
            <Button
              size="sm"
              className="flex-1 rounded-full"
              disabled={updating}
              onClick={() => {
                onSelect();
                onStatus(agentCase.id, action.nextStatus!);
              }}
              data-testid={`button-card-primary-${agentCase.id}`}
            >
              {action.cta}
            </Button>
          ) : (
            <Button size="sm" className="flex-1 rounded-full" variant="secondary" disabled data-testid={`button-card-complete-${agentCase.id}`}>
              No action
            </Button>
          )}
          {action.secondaryStatus ? (
            <Button
              size="sm"
              variant={action.secondaryStatus === "declined" ? "destructive" : "outline"}
              className="rounded-full"
              disabled={updating}
              onClick={() => {
                onSelect();
                onStatus(agentCase.id, action.secondaryStatus!, action.secondaryReason);
              }}
              data-testid={`button-card-secondary-${agentCase.id}`}
            >
              {action.secondaryCta}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="rounded-full" onClick={onSelect} data-testid={`button-card-open-${agentCase.id}`}>
              View packet
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NextStepPanel({
  agentCase,
  updating,
  onUpdate,
}: {
  agentCase: AgentCase;
  updating: boolean;
  onUpdate: (id: string, status: AgentCaseStatus, reason?: string) => void;
}) {
  const action = actionForCase(agentCase);
  const Icon = action.icon;

  return (
    <Card className="bg-card/95">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("rounded-full", statusClass(agentCase.status))}>{statusLabel(agentCase.status)}</Badge>
                <Badge variant="outline" className="rounded-full">
                  {agentCase.id}
                </Badge>
                <Badge variant="secondary" className="rounded-full" data-testid="badge-assignment-fee">
                  Assignment fee {money(agentCase.assignmentFee)}
                </Badge>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]" data-testid="text-next-action">
                Next step: {action.headline}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{action.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {action.nextStatus ? (
              <Button className="rounded-full" disabled={updating} onClick={() => onUpdate(agentCase.id, action.nextStatus!)} data-testid="button-next-primary">
                {action.cta}
              </Button>
            ) : (
              <Button className="rounded-full" variant="secondary" disabled data-testid="button-next-complete">
                Complete
              </Button>
            )}
            {action.secondaryStatus ? (
              <Button
                className="rounded-full"
                variant={action.secondaryStatus === "declined" ? "destructive" : "outline"}
                disabled={updating}
                onClick={() => onUpdate(agentCase.id, action.secondaryStatus!, action.secondaryReason)}
                data-testid="button-next-secondary"
              >
                {action.secondaryCta}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentSummary({ agentCase }: { agentCase: AgentCase }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Assignment summary
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {[
          ["Customer", agentCase.customer.name],
          ["Line", agentCase.lineType],
          ["Carrier", agentCase.carrierName],
          ["Product", agentCase.productName],
          ["Face amount", money(agentCase.faceAmount)],
          ["Assignment fee", money(agentCase.assignmentFee)],
          ["Due", agentCase.dueBy],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
          </div>
        ))}
        <div className="rounded-xl bg-primary/10 p-3 sm:col-span-2">
          <div className="flex items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Agent-facing fee</p>
              <p className="mt-2 text-sm leading-6">
                PolicyQuoters collects this assignment fee from the agent for the completed customer handoff. It is not shown in the consumer shopping flow.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteSnapshot({ agentCase }: { agentCase: AgentCase }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4 text-primary" />
          Selected quote
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {[
          ["Monthly", premium(agentCase.monthlyPremium)],
          ["Annual", premium(agentCase.annualPremium)],
          ["AM Best", agentCase.amBestRating],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CustomerPanel({ agentCase }: { agentCase: AgentCase }) {
  const locked = isAcceptanceStatus(agentCase.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PhoneCall className="h-4 w-4 text-primary" />
          Customer contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locked ? (
          <div className="rounded-xl bg-amber-100 p-3 text-sm leading-6 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Accept the assignment first, then call or email the customer from this panel.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-start rounded-full" data-testid="link-call-customer">
              <a href={`tel:${agentCase.customer.phone}`}>
                <PhoneCall className="mr-2 h-4 w-4" />
                {agentCase.customer.phone}
              </a>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-full" data-testid="link-email-customer">
              <a href={`mailto:${agentCase.customer.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email customer
              </a>
            </Button>
          </div>
        )}
        <div className="rounded-xl bg-muted p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Customer notes</p>
          <p className="mt-2 leading-6">{agentCase.intake.notes || "No extra notes."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowChecklist({ agentCase }: { agentCase: AgentCase }) {
  const steps = agentCase.checklist;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Simple workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", item.complete ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
              {item.complete ? <Check className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EligibilityPanel({ agentCase }: { agentCase: AgentCase }) {
  const checks = [
    ["Licensed in state", agentCase.eligibility.licensedInState],
    ["Carrier appointed", agentCase.eligibility.appointedWithCarrier],
    ["Capacity available", agentCase.eligibility.capacityAvailable],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Why this matched
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {checks.map(([label, ok]) => (
            <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3 text-sm">
              <span>{label}</span>
              {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
            </div>
          ))}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{agentCase.eligibility.priorityReason}</p>
      </CardContent>
    </Card>
  );
}

function LatestActivity({ agentCase }: { agentCase: AgentCase }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Latest activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {agentCase.auditTrail.slice(0, 3).map((entry, index) => (
          <div key={`${entry.at}-${entry.event}-${index}`} className="rounded-xl bg-muted p-3 text-sm">
            <p className="font-medium">{entry.event}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.at} · {entry.actor}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CaseDetail({
  agentCase,
  onUpdate,
  updating,
}: {
  agentCase?: AgentCase;
  onUpdate: (id: string, status: AgentCaseStatus, reason?: string) => void;
  updating: boolean;
}) {
  if (!agentCase) {
    return (
      <Card className="min-h-[28rem]">
        <CardContent className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center text-muted-foreground">Select an assignment to review the packet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <NextStepPanel agentCase={agentCase} onUpdate={onUpdate} updating={updating} />
      <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
        <div className="space-y-4">
          <AssignmentSummary agentCase={agentCase} />
          <CustomerPanel agentCase={agentCase} />
          <QuoteSnapshot agentCase={agentCase} />
        </div>
        <div className="space-y-4">
          <WorkflowChecklist agentCase={agentCase} />
          <EligibilityPanel agentCase={agentCase} />
          <LatestActivity agentCase={agentCase} />
        </div>
      </div>
    </div>
  );
}

export default function AgentPortal() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>();
  const { data: cases = [], isLoading } = useQuery<AgentCase[]>({ queryKey: ["/api/agent/cases"] });
  const { data: readiness } = useQuery<AgentProfileReadiness>({ queryKey: ["/api/agent/profile"] });

  const sortedCases = useMemo(() => [...cases].sort((a, b) => caseRank(a) - caseRank(b) || b.priorityScore - a.priorityScore), [cases]);

  useEffect(() => {
    if (!selectedCaseId && sortedCases.length > 0) setSelectedCaseId(sortedCases[0].id);
  }, [sortedCases, selectedCaseId]);

  const selectedCase = sortedCases.find((agentCase) => agentCase.id === selectedCaseId) ?? sortedCases[0];
  const metrics = useMemo(() => {
    const needsDecision = cases.filter((item) => isAcceptanceStatus(item.status)).length;
    const dueToday = cases.filter((item) => !isClosedStatus(item.status) && item.dueBy.toLowerCase().startsWith("today")).length;
    const inProgress = cases.filter((item) => activeStatuses.includes(item.status)).length;
    const completed = cases.filter((item) => item.status === "issued").length;
    return { needsDecision, dueToday, inProgress, completed };
  }, [cases]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: AgentCaseStatus; reason?: string }) =>
      (await apiRequest("PATCH", `/api/agent/cases/${id}/status`, { status, reason })).json() as Promise<AgentCase>,
    onSuccess: async (updatedCase) => {
      setSelectedCaseId(updatedCase.id);
      await queryClient.invalidateQueries({ queryKey: ["/api/agent/cases"] });
    },
  });

  const updateStatus = (id: string, status: AgentCaseStatus, reason?: string) => {
    statusMutation.mutate({ id, status, reason });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              Demo workspace
            </Badge>
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-onboarding">
              <Link href="/agent/onboarding">Agent setup</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-consumer-app">
              <Link href="/">Consumer app</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <ReadinessBanner readiness={readiness} />
        <section className="mb-5 rounded-3xl border border-border bg-card/86 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">
                Assignment queue
              </Badge>
              <h1 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Agent task inbox</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Each policy purchase becomes a simple task: accept it, call the customer, open the eApp, submit, and track carrier outcome.
              </p>
            </div>
            <div className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{metrics.needsDecision}</span> assignment{metrics.needsDecision === 1 ? "" : "s"} need a decision now.
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
          <aside className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <MetricCard title="Needs decision" value={String(metrics.needsDecision)} detail="Accept or decline" icon={UserRoundCheck} />
              <MetricCard title="Due today" value={String(metrics.dueToday)} detail="Time-sensitive cases" icon={Clock3} />
              <MetricCard title="In progress" value={String(metrics.inProgress)} detail="Accepted and moving" icon={Activity} />
              <MetricCard title="Completed" value={String(metrics.completed)} detail="Issued policies" icon={BadgeCheck} />
            </div>
            <div className="space-y-3" data-testid="list-agent-cases">
              {isLoading ? (
                <Card>
                  <CardContent className="p-5 text-sm text-muted-foreground">Loading assignments...</CardContent>
                </Card>
              ) : (
                sortedCases.map((agentCase) => (
                  <QueueCard
                    key={agentCase.id}
                    agentCase={agentCase}
                    active={selectedCase?.id === agentCase.id}
                    updating={statusMutation.isPending}
                    onSelect={() => setSelectedCaseId(agentCase.id)}
                    onStatus={updateStatus}
                  />
                ))
              )}
            </div>
          </aside>

          <section>
            <CaseDetail agentCase={selectedCase} onUpdate={updateStatus} updating={statusMutation.isPending} />
          </section>
        </div>
      </div>
    </main>
  );
}
