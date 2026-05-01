import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  FileSignature,
  Layers3,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentProductLine, AgentProfile, AgentProfileReadiness } from "@shared/schema";

const states = ["NY", "FL", "TX", "CA", "PA", "NJ", "GA", "AZ", "NC", "OH", "MI", "IL"];
const carriers = ["Banner Life", "Protective", "Pacific Life", "Prudential", "Guardian", "MassMutual", "Nationwide", "Lincoln Financial", "Transamerica"];
const productLines: Array<{ id: AgentProductLine; label: string; description: string }> = [
  { id: "term-life", label: "Term Life", description: "Low-cost death benefit cases." },
  { id: "iul", label: "IUL", description: "Indexed universal life and cash-value cases." },
  { id: "mortgage-protection", label: "Mortgage Protection", description: "Coverage aligned to mortgage payoff needs." },
  { id: "whole-life", label: "Whole Life", description: "Lifetime coverage and guaranteed cash value." },
  { id: "universal-life", label: "Universal Life", description: "Flexible permanent coverage." },
  { id: "final-expense", label: "Final Expense", description: "Smaller burial and final-cost policies." },
  { id: "annuities", label: "Annuities", description: "Retirement accumulation and income products." },
];

const emptyProfile: AgentProfile = {
  name: "",
  agency: "",
  npn: "",
  email: "",
  phone: "",
  licenseStates: [],
  carrierAppointments: [],
  productLines: [],
  weeklyCapacity: 10,
  acceptsInstantAssignments: false,
  paymentMethod: {
    brand: "Visa",
    last4: "4242",
    status: "not-added",
  },
  agreementAccepted: false,
  feeAuthorizationAccepted: false,
};

function Logo({ subtitle = "Agent onboarding" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-10 w-10 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold leading-none">PolicyQuoters</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  testId: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      data-testid={testId}
      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}

function SectionCard({ title, icon: Icon, children, detail }: { title: string; icon: LucideIcon; children: React.ReactNode; detail?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {detail ? <p className="text-sm leading-6 text-muted-foreground">{detail}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OptionButton({
  selected,
  label,
  description,
  onClick,
  testId,
}: {
  selected: boolean;
  label: string;
  description?: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "rounded-2xl border p-3 text-left transition hover:border-primary/70",
        selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        {selected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
      </span>
      {description ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
    </button>
  );
}

function ReadinessPanel({ readiness }: { readiness?: AgentProfileReadiness }) {
  const ready = Boolean(readiness?.ready);
  const score = readiness?.score ?? 0;

  return (
    <Card className="sticky top-24 bg-card/95">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className={cn("rounded-full", ready ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-900 hover:bg-amber-100")}>
              {ready ? "Ready for assignments" : "Setup needed"}
            </Badge>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{score}% ready</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Complete these requirements before sending paid assignments to this agent.</p>
          </div>
          {ready ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <XCircle className="h-6 w-6 text-amber-700" />}
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${score}%` }} />
        </div>
        <div className="space-y-2">
          {(readiness?.missing.length ? readiness.missing : ["Profile complete. Agent can receive instant assignments."]).map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
              {ready ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentOnboarding() {
  const { data: readiness, isLoading } = useQuery<AgentProfileReadiness>({ queryKey: ["/api/agent/profile"] });
  const [profile, setProfile] = useState<AgentProfile>(emptyProfile);

  useEffect(() => {
    if (readiness?.profile) setProfile(readiness.profile);
  }, [readiness]);

  const readinessPreview = useMemo<AgentProfileReadiness>(() => {
    const missing: string[] = [];
    if (!profile.licenseStates.length) missing.push("Add at least one licensed state.");
    if (!profile.carrierAppointments.length) missing.push("Add at least one carrier appointment.");
    if (!profile.productLines.length) missing.push("Select product lines you will accept.");
    if (profile.weeklyCapacity < 1) missing.push("Set weekly assignment capacity.");
    if (profile.paymentMethod.status !== "verified") missing.push("Add a verified payment method.");
    if (!profile.agreementAccepted) missing.push("Accept the partner assignment agreement.");
    if (!profile.feeAuthorizationAccepted) missing.push("Authorize assignment-fee charges.");
    if (!profile.acceptsInstantAssignments) missing.push("Turn on instant assignments.");
    return {
      ready: missing.length === 0,
      score: Math.round(((8 - missing.length) / 8) * 100),
      missing,
      profile,
    };
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (payload: AgentProfile) => (await apiRequest("PUT", "/api/agent/profile", payload)).json() as Promise<AgentProfileReadiness>,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/agent/profile"] });
    },
  });

  const updateProfile = <K extends keyof AgentProfile>(key: K, value: AgentProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
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
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-admin-console">
              <Link href="/admin">Admin console</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-agent-portal">
              <Link href="/agent">Agent portal</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full" data-testid="button-open-consumer-app">
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
                Agent setup
              </Badge>
              <h1 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Onboard agents for paid assignments</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Capture licensing, carrier appointments, capacity, payment method, and authorization terms before routing completed customer purchases.
              </p>
            </div>
            <Button
              className="rounded-full"
              disabled={saveMutation.isPending || isLoading}
              onClick={() => saveMutation.mutate(profile)}
              data-testid="button-save-agent-profile"
            >
              {saveMutation.isPending ? "Saving..." : "Save setup"}
            </Button>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-4">
            <SectionCard title="Agent identity" icon={UserRound} detail="Basic producer information used on assignment records and compliance review.">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Agent name">
                  <TextInput value={profile.name} onChange={(value) => updateProfile("name", value)} placeholder="Maya Thompson" testId="input-agent-name" />
                </Field>
                <Field label="Agency">
                  <TextInput value={profile.agency} onChange={(value) => updateProfile("agency", value)} placeholder="PolicyQuoters Partner Network" testId="input-agent-agency" />
                </Field>
                <Field label="NPN">
                  <TextInput value={profile.npn} onChange={(value) => updateProfile("npn", value)} placeholder="18273645" testId="input-agent-npn" />
                </Field>
                <Field label="Email">
                  <TextInput value={profile.email} onChange={(value) => updateProfile("email", value)} placeholder="agent@example.com" type="email" testId="input-agent-email" />
                </Field>
                <Field label="Phone">
                  <TextInput value={profile.phone} onChange={(value) => updateProfile("phone", value)} placeholder="(800) 555-0148" testId="input-agent-phone" />
                </Field>
                <Field label="Weekly capacity">
                  <input
                    value={profile.weeklyCapacity}
                    onChange={(event) => updateProfile("weeklyCapacity", Number(event.target.value))}
                    type="number"
                    min={1}
                    max={100}
                    data-testid="input-weekly-capacity"
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Licensed states" icon={MapPin} detail="Only route assignments where the agent is licensed.">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {states.map((state) => (
                  <OptionButton
                    key={state}
                    selected={profile.licenseStates.includes(state)}
                    label={state}
                    onClick={() => updateProfile("licenseStates", toggleValue(profile.licenseStates, state))}
                    testId={`button-state-${state}`}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Carrier appointments" icon={Building2} detail="Use this to match selected customer quotes to agents who can service the carrier.">
              <div className="grid gap-2 md:grid-cols-3">
                {carriers.map((carrier) => (
                  <OptionButton
                    key={carrier}
                    selected={profile.carrierAppointments.includes(carrier)}
                    label={carrier}
                    onClick={() => updateProfile("carrierAppointments", toggleValue(profile.carrierAppointments, carrier))}
                    testId={`button-carrier-${carrier.toLowerCase().replaceAll(" ", "-")}`}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Product lines" icon={Layers3} detail="Agents can opt into the insurance lines they are willing to accept.">
              <div className="grid gap-2 md:grid-cols-2">
                {productLines.map((line) => (
                  <OptionButton
                    key={line.id}
                    selected={profile.productLines.includes(line.id)}
                    label={line.label}
                    description={line.description}
                    onClick={() => updateProfile("productLines", toggleValue(profile.productLines, line.id))}
                    testId={`button-product-${line.id}`}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Payment setup" icon={CreditCard} detail="Prototype payment vaulting for charging assignment fees after the customer-selected policy is assigned.">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <Field label="Card brand">
                  <TextInput
                    value={profile.paymentMethod.brand}
                    onChange={(value) => updateProfile("paymentMethod", { ...profile.paymentMethod, brand: value })}
                    placeholder="Visa"
                    testId="input-card-brand"
                  />
                </Field>
                <Field label="Last four">
                  <TextInput
                    value={profile.paymentMethod.last4}
                    onChange={(value) => updateProfile("paymentMethod", { ...profile.paymentMethod, last4: value.slice(0, 4) })}
                    placeholder="4242"
                    testId="input-card-last4"
                  />
                </Field>
                <Button
                  variant={profile.paymentMethod.status === "verified" ? "secondary" : "default"}
                  className="h-11 rounded-full"
                  onClick={() => updateProfile("paymentMethod", { ...profile.paymentMethod, status: "verified" })}
                  data-testid="button-verify-payment"
                >
                  {profile.paymentMethod.status === "verified" ? "Verified" : "Verify card"}
                </Button>
              </div>
              <div className="mt-3 rounded-xl bg-muted p-3 text-sm leading-6 text-muted-foreground">
                Production version should use Stripe, Plaid, or a compliant payment processor. This prototype stores only a mock brand, last four, and verification status.
              </div>
            </SectionCard>

            <SectionCard title="Assignment terms" icon={FileSignature} detail="Make agents explicitly acknowledge when fees apply before they can receive assignments.">
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4">
                  <input
                    type="checkbox"
                    checked={profile.agreementAccepted}
                    onChange={(event) => updateProfile("agreementAccepted", event.target.checked)}
                    data-testid="checkbox-partner-agreement"
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="font-medium">I accept the PolicyQuoters partner assignment agreement.</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      The agent agrees to service accepted customer assignments promptly and maintain required licensing and appointment information.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4">
                  <input
                    type="checkbox"
                    checked={profile.feeAuthorizationAccepted}
                    onChange={(event) => updateProfile("feeAuthorizationAccepted", event.target.checked)}
                    data-testid="checkbox-fee-authorization"
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="font-medium">I authorize PolicyQuoters to charge assignment fees shown before acceptance.</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      The fee will be displayed on each assignment before acceptance. Refund, waiver, and charge timing rules can be finalized in the production agreement.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4">
                  <input
                    type="checkbox"
                    checked={profile.acceptsInstantAssignments}
                    onChange={(event) => updateProfile("acceptsInstantAssignments", event.target.checked)}
                    data-testid="checkbox-instant-assignments"
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="font-medium">Turn on instant assignments.</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      When enabled, this agent can receive completed customer purchases automatically when matching rules are satisfied.
                    </span>
                  </span>
                </label>
              </div>
            </SectionCard>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" className="rounded-full" data-testid="button-back-agent-portal">
                <Link href="/agent">Back to portal</Link>
              </Button>
              <Button
                className="rounded-full"
                disabled={saveMutation.isPending || isLoading}
                onClick={() => saveMutation.mutate(profile)}
                data-testid="button-save-agent-profile-bottom"
              >
                {saveMutation.isPending ? "Saving..." : "Save agent setup"}
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <ReadinessPanel readiness={readinessPreview} />
            <Card>
              <CardContent className="space-y-3 p-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Matching rules preview
                </CardTitle>
                <div className="space-y-2 text-sm">
                  {[
                    `${profile.licenseStates.length} licensed state${profile.licenseStates.length === 1 ? "" : "s"}`,
                    `${profile.carrierAppointments.length} carrier appointment${profile.carrierAppointments.length === 1 ? "" : "s"}`,
                    `${profile.productLines.length} product line${profile.productLines.length === 1 ? "" : "s"}`,
                    `${profile.weeklyCapacity} assignment weekly capacity`,
                    profile.paymentMethod.status === "verified" ? "Payment method verified" : "Payment method not verified",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-xl bg-muted p-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
