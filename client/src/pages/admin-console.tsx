import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminAssignmentCase, AdminAssignmentDashboard, RoutingCandidate } from "@shared/schema";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function premium(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
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
        <p className="text-xs text-muted-foreground">Admin routing console</p>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "issued") return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  if (status === "declined" || status === "not-placed") return "bg-rose-100 text-rose-800 hover:bg-rose-100";
  if (status === "available") return "bg-amber-100 text-amber-900 hover:bg-amber-100";
  if (status === "assigned") return "bg-blue-100 text-blue-900 hover:bg-blue-100";
  return "bg-primary/10 text-primary hover:bg-primary/10";
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <Card>
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

function CaseQueueCard({ agentCase, active, onSelect }: { agentCase: AdminAssignmentCase; active: boolean; onSelect: () => void }) {
  const recommended = agentCase.routing.candidates.find((candidate) => candidate.agentId === agentCase.routing.recommendedAgentId);

  return (
    <button type="button" onClick={onSelect} className="w-full text-left" data-testid={`button-admin-case-${agentCase.id}`}>
      <Card className={cn("transition hover:border-primary/60", active && "border-primary bg-primary/5 ring-2 ring-primary/20")}>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{agentCase.customer.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {agentCase.customer.state} · {agentCase.carrierName} · {agentCase.lineType}
              </p>
            </div>
            <Badge className={cn("rounded-full", statusClass(agentCase.status))}>{agentCase.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-muted p-2">
              <p className="text-muted-foreground">Fee</p>
              <p className="mt-1 font-mono font-semibold">{money(agentCase.assignmentFee)}</p>
            </div>
            <div className="rounded-xl bg-muted p-2">
              <p className="text-muted-foreground">Score</p>
              <p className="mt-1 font-mono font-semibold">{agentCase.routing.recommendedScore}</p>
            </div>
            <div className="rounded-xl bg-muted p-2">
              <p className="text-muted-foreground">Attempts</p>
              <p className="mt-1 font-mono font-semibold">{agentCase.routing.attempts}</p>
            </div>
          </div>
          <div className="rounded-xl bg-background p-3 text-xs leading-5 text-muted-foreground">
            Recommended: <span className="font-medium text-foreground">{recommended?.name ?? "No eligible agent"}</span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function CandidateCard({
  candidate,
  recommended,
  updating,
  onAssign,
}: {
  candidate: RoutingCandidate;
  recommended: boolean;
  updating: boolean;
  onAssign: (candidate: RoutingCandidate) => void;
}) {
  return (
    <Card className={cn("bg-card", recommended && "border-primary bg-primary/5")}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{candidate.name}</p>
              {recommended ? <Badge className="rounded-full bg-primary text-primary-foreground">Recommended</Badge> : null}
              <Badge className={cn("rounded-full", candidate.eligible ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-rose-100 text-rose-800 hover:bg-rose-100")}>
                {candidate.eligible ? "Eligible" : "Blocked"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{candidate.agency}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-semibold">{candidate.score}</p>
            <p className="text-xs text-muted-foreground">match score</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{candidate.explanation}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {candidate.signals.map((signal) => (
            <div key={signal.label} className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs leading-5">
              {signal.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
              <div>
                <p className="font-medium">{signal.label}</p>
                <p className="text-muted-foreground">{signal.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <span>{candidate.activeAssignments}/{candidate.weeklyCapacity} active</span>
          <span>{candidate.performanceScore}% performance</span>
          <span>{Math.round(candidate.declineRate * 100)}% decline rate</span>
        </div>
        <Button
          className="w-full rounded-full"
          variant={candidate.eligible ? "default" : "outline"}
          disabled={updating}
          onClick={() => onAssign(candidate)}
          data-testid={`button-assign-${candidate.agentId}`}
        >
          Assign to {candidate.name.split(" ")[0]}
        </Button>
      </CardContent>
    </Card>
  );
}

function CaseDetail({
  agentCase,
  updating,
  onAssign,
  onReroute,
  onExpire,
}: {
  agentCase?: AdminAssignmentCase;
  updating: boolean;
  onAssign: (agentId: string, reason?: string) => void;
  onReroute: (reason?: string) => void;
  onExpire: (reason?: string) => void;
}) {
  if (!agentCase) {
    return (
      <Card className="min-h-[32rem]">
        <CardContent className="flex min-h-[32rem] items-center justify-center p-8 text-center text-muted-foreground">Select a case to review routing options.</CardContent>
      </Card>
    );
  }

  const recommended = agentCase.routing.candidates.find((candidate) => candidate.agentId === agentCase.routing.recommendedAgentId);

  return (
    <div className="space-y-4">
      <Card className="bg-card/95">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("rounded-full", statusClass(agentCase.status))}>{agentCase.status}</Badge>
                <Badge variant="outline" className="rounded-full">{agentCase.id}</Badge>
                <Badge variant="secondary" className="rounded-full">Fee {money(agentCase.assignmentFee)}</Badge>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]" data-testid="text-admin-case-title">
                {agentCase.customer.name} · {agentCase.carrierName}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Recommended match: <span className="font-medium text-foreground">{recommended?.name ?? "No eligible agent"}</span>
                {recommended ? ` with score ${recommended.score}.` : ". Move the case to admin queue or update agent eligibility."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                disabled={!recommended || updating}
                onClick={() => recommended && onAssign(recommended.agentId, `Admin accepted recommended match score ${recommended.score}.`)}
                data-testid="button-assign-recommended"
              >
                Assign recommended
              </Button>
              <Button variant="outline" className="rounded-full" disabled={updating} onClick={() => onReroute("Admin requested reroute to next eligible agent.")} data-testid="button-reroute-case">
                Reroute
              </Button>
              <Button variant="outline" className="rounded-full" disabled={updating} onClick={() => onExpire("Acceptance SLA expired in admin review.")} data-testid="button-expire-case">
                Expire
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-primary" />
                Assignment economics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                ["Annual premium", premium(agentCase.annualPremium)],
                ["Assignment fee", money(agentCase.assignmentFee)],
                ["Fee tier", agentCase.feeTier],
                ["Charge status", agentCase.chargeStatus],
                ["Acceptance expires", `${agentCase.routing.expiresInMinutes} min`],
                ["Required line", agentCase.routing.requiredProductLine.replaceAll("-", " ")],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" />
                Current assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">Assigned agent</p>
                <p className="mt-1 font-semibold">{agentCase.assignedAgent.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{agentCase.assignedAgent.agency}</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="mt-1 font-semibold">{agentCase.customer.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{agentCase.customer.state} · {agentCase.customer.phone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Routing timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {agentCase.auditTrail.slice(0, 5).map((entry, index) => (
                <div key={`${entry.at}-${entry.event}-${index}`} className="rounded-xl bg-muted p-3 text-sm">
                  <p className="font-medium">{entry.event}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.at} · {entry.actor}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Candidate ranking</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Scores combine state licensing, carrier appointment, product fit, payment readiness, fee authorization, capacity, decline rate, and performance.
                </p>
              </div>
            </CardContent>
          </Card>
          {agentCase.routing.candidates.map((candidate) => (
            <CandidateCard
              key={candidate.agentId}
              candidate={candidate}
              recommended={candidate.agentId === agentCase.routing.recommendedAgentId}
              updating={updating}
              onAssign={(selected) => onAssign(selected.agentId, `Admin manually selected ${selected.name} with score ${selected.score}.`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminConsole() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>();
  const { data, isLoading } = useQuery<AdminAssignmentDashboard>({ queryKey: ["/api/admin/assignments"] });
  const cases = data?.cases ?? [];

  useEffect(() => {
    if (!selectedCaseId && cases.length > 0) setSelectedCaseId(cases[0].id);
  }, [cases, selectedCaseId]);

  const sortedCases = useMemo(
    () =>
      [...cases].sort((a, b) => {
        const rank = (item: AdminAssignmentCase) => (item.status === "available" || item.status === "declined" ? 0 : item.status === "assigned" ? 1 : 2);
        return rank(a) - rank(b) || b.assignmentFee - a.assignmentFee;
      }),
    [cases],
  );
  const selectedCase = sortedCases.find((agentCase) => agentCase.id === selectedCaseId) ?? sortedCases[0];

  const assignMutation = useMutation({
    mutationFn: async ({ caseId, agentId, reason }: { caseId: string; agentId: string; reason?: string }) =>
      (await apiRequest("POST", `/api/admin/cases/${caseId}/assign`, { agentId, reason })).json() as Promise<AdminAssignmentCase>,
    onSuccess: async (updatedCase) => {
      setSelectedCaseId(updatedCase.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/agent/cases"] }),
      ]);
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ caseId, action, reason }: { caseId: string; action: "reroute" | "expire"; reason?: string }) =>
      (await apiRequest("POST", `/api/admin/cases/${caseId}/${action}`, { reason })).json() as Promise<AdminAssignmentCase>,
    onSuccess: async (updatedCase) => {
      setSelectedCaseId(updatedCase.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/agent/cases"] }),
      ]);
    },
  });

  const updating = assignMutation.isPending || actionMutation.isPending;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              Internal MVP
            </Badge>
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-agent-portal">
              <Link href="/agent">Agent portal</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-agent-setup">
              <Link href="/agent/onboarding">Agent setup</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-consumer">
              <Link href="/">Consumer app</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <section className="mb-5 rounded-3xl border border-border bg-card/86 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">
                Routing operations
              </Badge>
              <h1 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Assignment routing console</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Review completed customer purchases, see eligible agent matches, route or reroute assignments, and monitor fee status.
              </p>
            </div>
            <div className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{data?.metrics.needsReroute ?? 0}</span> case{data?.metrics.needsReroute === 1 ? "" : "s"} need routing attention.
            </div>
          </div>
        </section>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Waiting" value={String(data?.metrics.waitingForAssignment ?? 0)} detail="Available or declined" icon={AlertTriangle} />
          <MetricCard title="Needs reroute" value={String(data?.metrics.needsReroute ?? 0)} detail="Admin attention" icon={Route} />
          <MetricCard title="Active assignments" value={String(data?.metrics.activeAssignments ?? 0)} detail="Agent-owned cases" icon={UserRoundCheck} />
          <MetricCard title="Potential fees" value={money(data?.metrics.potentialFees ?? 0)} detail="Open assignment value" icon={DollarSign} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
          <aside className="space-y-3" data-testid="list-admin-cases">
            {isLoading ? (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">Loading routing queue...</CardContent>
              </Card>
            ) : (
              sortedCases.map((agentCase) => (
                <CaseQueueCard key={agentCase.id} agentCase={agentCase} active={selectedCase?.id === agentCase.id} onSelect={() => setSelectedCaseId(agentCase.id)} />
              ))
            )}
          </aside>

          <section>
            <CaseDetail
              agentCase={selectedCase}
              updating={updating}
              onAssign={(agentId, reason) => selectedCase && assignMutation.mutate({ caseId: selectedCase.id, agentId, reason })}
              onReroute={(reason) => selectedCase && actionMutation.mutate({ caseId: selectedCase.id, action: "reroute", reason })}
              onExpire={(reason) => selectedCase && actionMutation.mutate({ caseId: selectedCase.id, action: "expire", reason })}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
