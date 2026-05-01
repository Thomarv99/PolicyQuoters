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
  Filter,
  Handshake,
  PhoneCall,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AgentCase, AgentCaseStatus } from "@shared/schema";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function premium(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function statusLabel(status: AgentCaseStatus) {
  const labels: Record<AgentCaseStatus, string> = {
    available: "Available",
    assigned: "Assigned",
    accepted: "Accepted",
    contacted: "Contacted",
    "application-started": "App started",
    submitted: "Submitted",
    issued: "Issued",
    declined: "Declined",
    "not-placed": "Not placed",
  };
  return labels[status];
}

function statusClass(status: AgentCaseStatus) {
  if (status === "issued") return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  if (status === "declined" || status === "not-placed") return "bg-rose-100 text-rose-800 hover:bg-rose-100";
  if (status === "assigned" || status === "available") return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  return "bg-primary/10 text-primary hover:bg-primary/10";
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
        <p className="text-xs text-muted-foreground">Agent Assignment Portal</p>
      </div>
    </div>
  );
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: typeof Activity }) {
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

function QueueCard({ agentCase, active, onSelect }: { agentCase: AgentCase; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:bg-muted/40",
        active && "border-primary bg-primary/5 shadow-sm",
      )}
      data-testid={`button-case-${agentCase.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{agentCase.customer.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {agentCase.lineType} · {agentCase.customer.state} · {agentCase.carrierName}
          </p>
        </div>
        <Badge className={cn("rounded-full", statusClass(agentCase.status))}>{statusLabel(agentCase.status)}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-background p-2">
          <p className="text-muted-foreground">Annual</p>
          <p className="mt-1 font-mono font-semibold">{premium(agentCase.annualPremium)}</p>
        </div>
        <div className="rounded-xl bg-background p-2">
          <p className="text-muted-foreground">Priority</p>
          <p className="mt-1 font-mono font-semibold">{agentCase.priorityScore}</p>
        </div>
        <div className="rounded-xl bg-background p-2">
          <p className="text-muted-foreground">Due</p>
          <p className="mt-1 font-semibold">{agentCase.dueBy.split(",")[0]}</p>
        </div>
      </div>
    </button>
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
          Eligibility match
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map(([label, ok]) => (
          <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3 text-sm">
            <span>{label}</span>
            {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
          </div>
        ))}
        <p className="text-sm leading-6 text-muted-foreground">{agentCase.eligibility.priorityReason}</p>
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
          Selected quote snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {[
          ["Carrier", agentCase.carrierName],
          ["Product", agentCase.productName],
          ["Face amount", money(agentCase.faceAmount)],
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

function IntakePanel({ agentCase }: { agentCase: AgentCase }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRoundCheck className="h-4 w-4 text-primary" />
          Customer intake
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="mt-1 font-medium">{agentCase.customer.email}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="mt-1 font-medium">{agentCase.customer.phone}</p>
          </div>
          <div className="rounded-xl bg-muted p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="mt-1 font-medium">{agentCase.customer.address}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Beneficiary</p>
            <p className="mt-1 font-medium">{agentCase.intake.beneficiary}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">Owner</p>
            <p className="mt-1 font-medium">{agentCase.intake.owner}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Customer notes</p>
          <p className="mt-2 leading-6">{agentCase.intake.notes || "No extra notes."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistPanel({ agentCase }: { agentCase: AgentCase }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Handoff checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agentCase.checklist.map((item) => (
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

function StatusActions({ agentCase, onUpdate, loading }: { agentCase: AgentCase; onUpdate: (status: AgentCaseStatus, reason?: string) => void; loading: boolean }) {
  const actions: Array<{ label: string; status: AgentCaseStatus; icon: typeof CheckCircle2; variant?: "default" | "outline" | "secondary" | "destructive"; reason?: string }> = [
    { label: "Accept", status: "accepted", icon: CheckCircle2 },
    { label: "Contacted", status: "contacted", icon: PhoneCall, variant: "outline" },
    { label: "Start app", status: "application-started", icon: FileSignature, variant: "outline" },
    { label: "Submitted", status: "submitted", icon: ArrowUpRight, variant: "outline" },
    { label: "Issued", status: "issued", icon: Handshake, variant: "secondary" },
    { label: "Decline", status: "declined", icon: XCircle, variant: "destructive", reason: "Agent unavailable or not a fit for this carrier/state." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.status}
              variant={action.variant ?? "default"}
              className="justify-start rounded-full"
              disabled={loading || agentCase.status === action.status}
              onClick={() => onUpdate(action.status, action.reason)}
              data-testid={`button-status-${action.status}`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AuditTrail({ agentCase }: { agentCase: AgentCase }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit trail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agentCase.auditTrail.map((entry, index) => (
          <div key={`${entry.at}-${entry.event}-${index}`} className="border-l border-border pl-3 text-sm">
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

function AdminControls({ agentCase, cases, onUpdate, loading }: { agentCase: AgentCase; cases: AgentCase[]; onUpdate: (status: AgentCaseStatus, reason?: string) => void; loading: boolean }) {
  const totalFees = cases.filter((item) => item.chargeStatus !== "waived").reduce((sum, item) => sum + item.assignmentFee, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Internal assignment economics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted p-4">
            <p className="text-xs text-muted-foreground">Case assignment fee</p>
            <p className="mt-2 font-mono text-xl font-semibold">{money(agentCase.assignmentFee)}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-xs text-muted-foreground">Charge status</p>
            <p className="mt-2 text-xl font-semibold capitalize">{agentCase.chargeStatus}</p>
          </div>
          <div className="rounded-xl bg-muted p-4 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Tier applied</p>
            <p className="mt-2 text-sm font-semibold">{agentCase.feeTier}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-4 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Visible to internal/admin only</p>
            <p className="mt-2 text-sm leading-6">This panel is intentionally separated from the consumer app and agent case workflow. It can become the billing ledger for assignment fees, waivers, refunds, and charge attempts.</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full justify-start rounded-full" variant="outline" disabled={loading} onClick={() => onUpdate("assigned", "Admin reassigned this case back to the assigned queue.")} data-testid="button-admin-reassign">
            <UserRoundCheck className="mr-2 h-4 w-4" />
            Reassign case
          </Button>
          <Button className="w-full justify-start rounded-full" variant="outline" disabled={loading} onClick={() => onUpdate("not-placed", "Admin marked the case not placed and waived the assignment fee.")} data-testid="button-admin-not-placed">
            <XCircle className="mr-2 h-4 w-4" />
            Mark not placed
          </Button>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Open assignment fees</p>
            <p className="mt-2 font-mono text-lg font-semibold">{money(totalFees)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across current demo queue.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CaseDetail({
  agentCase,
  cases,
  onUpdate,
  updating,
}: {
  agentCase?: AgentCase;
  cases: AgentCase[];
  onUpdate: (status: AgentCaseStatus, reason?: string) => void;
  updating: boolean;
}) {
  if (!agentCase) {
    return (
      <Card className="min-h-[28rem]">
        <CardContent className="flex h-full min-h-[28rem] items-center justify-center p-8 text-center text-muted-foreground">Select a case to review the assignment packet.</CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="workspace" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-full", statusClass(agentCase.status))}>{statusLabel(agentCase.status)}</Badge>
            <Badge variant="outline" className="rounded-full">
              {agentCase.id}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.03em]">{agentCase.customer.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {agentCase.lineType} · {agentCase.productName} · {agentCase.customer.state}
          </p>
        </div>
        <TabsList className="grid w-full grid-cols-2 lg:w-[22rem]" data-testid="tabs-agent-detail">
          <TabsTrigger value="workspace" data-testid="tab-workspace">
            Agent workspace
          </TabsTrigger>
          <TabsTrigger value="admin" data-testid="tab-admin">
            Admin
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="workspace" className="space-y-4">
        <StatusActions agentCase={agentCase} onUpdate={onUpdate} loading={updating} />
        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <QuoteSnapshot agentCase={agentCase} />
            <IntakePanel agentCase={agentCase} />
          </div>
          <div className="space-y-4">
            <EligibilityPanel agentCase={agentCase} />
            <ChecklistPanel agentCase={agentCase} />
            <AuditTrail agentCase={agentCase} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="admin" className="space-y-4">
        <AdminControls agentCase={agentCase} cases={cases} onUpdate={onUpdate} loading={updating} />
      </TabsContent>
    </Tabs>
  );
}

export default function AgentPortal() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>();
  const { data: cases = [], isLoading } = useQuery<AgentCase[]>({ queryKey: ["/api/agent/cases"] });

  useEffect(() => {
    if (!selectedCaseId && cases.length > 0) setSelectedCaseId(cases[0].id);
  }, [cases, selectedCaseId]);

  const selectedCase = cases.find((agentCase) => agentCase.id === selectedCaseId) ?? cases[0];
  const metrics = useMemo(() => {
    const assigned = cases.filter((item) => item.status === "assigned").length;
    const active = cases.filter((item) => ["accepted", "contacted", "application-started", "submitted"].includes(item.status)).length;
    const fees = cases.filter((item) => item.chargeStatus !== "waived").reduce((sum, item) => sum + item.assignmentFee, 0);
    const averagePriority = cases.length ? Math.round(cases.reduce((sum, item) => sum + item.priorityScore, 0) / cases.length) : 0;
    return { assigned, active, fees, averagePriority };
  }, [cases]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: AgentCaseStatus; reason?: string }) =>
      (await apiRequest("PATCH", `/api/agent/cases/${id}/status`, { status, reason })).json() as Promise<AgentCase>,
    onSuccess: async (updatedCase) => {
      setSelectedCaseId(updatedCase.id);
      await queryClient.invalidateQueries({ queryKey: ["/api/agent/cases"] });
    },
  });

  const updateStatus = (status: AgentCaseStatus, reason?: string) => {
    if (!selectedCase) return;
    statusMutation.mutate({ id: selectedCase.id, status, reason });
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
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-consumer-app">
              <Link href="/">Consumer app</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <Alert className="bg-card/80">
            <Filter className="h-4 w-4" />
            <AlertTitle>Assignment queue</AlertTitle>
            <AlertDescription>Cases appear after a customer selects a quote, completes intake, accepts disclosures, and signs.</AlertDescription>
          </Alert>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard title="Assigned now" value={String(metrics.assigned)} detail="Needs agent action" icon={UserRoundCheck} />
            <MetricCard title="Active cases" value={String(metrics.active)} detail="Accepted or in progress" icon={Activity} />
            <MetricCard title="Open fees" value={money(metrics.fees)} detail="Internal/admin view" icon={DollarSign} />
            <MetricCard title="Avg priority" value={String(metrics.averagePriority)} detail="Routing score" icon={BadgeCheck} />
          </div>
          <div className="space-y-3" data-testid="list-agent-cases">
            {isLoading ? (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">Loading assignments...</CardContent>
              </Card>
            ) : (
              cases.map((agentCase) => <QueueCard key={agentCase.id} agentCase={agentCase} active={selectedCase?.id === agentCase.id} onSelect={() => setSelectedCaseId(agentCase.id)} />)
            )}
          </div>
        </aside>

        <section>
          <CaseDetail agentCase={selectedCase} cases={cases} onUpdate={updateStatus} updating={statusMutation.isPending} />
        </section>
      </div>
    </main>
  );
}
