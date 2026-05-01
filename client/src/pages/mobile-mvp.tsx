import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardSignature,
  FileText,
  HeartPulse,
  Home,
  Lock,
  PenLine,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
} from "lucide-react";
import type { ApplicationIntake, AssignmentResponse, QuoteOption, QuoteRequest, QuoteResponse } from "@shared/schema";

type Step = "welcome" | "quote" | "results" | "selected" | "intake" | "disclosures" | "sign" | "assigned";

const steps: Step[] = ["welcome", "quote", "results", "selected", "intake", "disclosures", "sign", "assigned"];

const defaultQuote: QuoteRequest = {
  faceAmount: 750000,
  age: 42,
  gender: "male",
  state: "NY",
  healthClass: "preferred",
  tobacco: false,
  termLength: 20,
};

const defaultIntake: Omit<ApplicationIntake, "quoteId"> = {
  legalName: "Jordan Riley",
  email: "jordan.riley@example.com",
  phone: "(212) 555-0198",
  address: "125 Hudson Street, New York, NY 10013",
  beneficiary: "Spouse - primary beneficiary",
  owner: "Insured owns the policy",
  annualIncome: 185000,
  replacement: false,
  notes: "Customer wants the best value term quote with strong conversion language.",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-9 w-9 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-sm font-semibold leading-none">PolicyQuoters</p>
        <p className="text-[11px] text-muted-foreground">Mobile MVP</p>
      </div>
    </div>
  );
}

function Shell({
  step,
  children,
  onBack,
}: {
  step: Step;
  children: React.ReactNode;
  onBack: () => void;
}) {
  const index = steps.indexOf(step);
  const progress = ((index + 1) / steps.length) * 100;
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.13),_transparent_34rem),hsl(var(--background))] text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col border-x border-border bg-background/92 shadow-2xl shadow-slate-950/10" data-testid="screen-mobile-app">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Logo />
            {step !== "welcome" ? (
              <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span>{step === "welcome" ? "Start" : step}</span>
              <span>{index + 1}/{steps.length}</span>
            </div>
            <Progress value={progress} className="h-1.5" data-testid="progress-flow" />
          </div>
        </header>
        <div className="flex-1 px-4 py-5">{children}</div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex min-h-[calc(100vh-8.5rem)] flex-col justify-between gap-8">
      <div className="space-y-6 pt-2">
        <Badge className="rounded-full" variant="secondary">
          Life insurance shopping MVP
        </Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-[-0.04em]">Compare life quotes, then finish the application on your phone.</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            A consumer-first flow for quote comparison, selection, application intake, consent, e-sign, and licensed agent assignment.
          </p>
        </div>
        <div className="grid gap-3">
          {[
            ["Shop carriers", "Compare simulated carrier options side by side.", Sparkles],
            ["Select a quote", "Lock the quote assumptions before application intake.", BadgeCheck],
            ["Assign an agent", "Route the signed packet to an eligible licensed partner.", UserRoundCheck],
          ].map(([title, copy, Icon]) => (
            <Card key={title as string} className="bg-card/80">
              <CardContent className="flex items-start gap-3 p-4">
                <Icon className="mt-0.5 h-5 w-5 flex-none text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">{title as string}</h2>
                  <p className="text-xs leading-5 text-muted-foreground">{copy as string}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 p-4 backdrop-blur">
        <Button className="h-12 w-full rounded-full" onClick={onStart} data-testid="button-start">
          Start quote
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">Prototype only. Final premiums depend on underwriting and carrier approval.</p>
      </div>
    </section>
  );
}

function QuoteBasics({
  quote,
  setQuote,
  onSubmit,
  loading,
}: {
  quote: QuoteRequest;
  setQuote: (quote: QuoteRequest) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Get your quote</h1>
        <p className="mt-2 text-sm text-muted-foreground">Start with the minimum fields needed to compare real carrier options later.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <Field label="Coverage amount">
            <Input
              type="number"
              value={quote.faceAmount}
              onChange={(event) => setQuote({ ...quote, faceAmount: Number(event.target.value) })}
              data-testid="input-face-amount"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <Input type="number" value={quote.age} onChange={(event) => setQuote({ ...quote, age: Number(event.target.value) })} data-testid="input-age" />
            </Field>
            <Field label="State">
              <Select value={quote.state} onValueChange={(value) => setQuote({ ...quote, state: value })}>
                <SelectTrigger data-testid="select-state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["NY", "FL", "TX", "CA", "PA", "OH", "GA"].map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <Select value={quote.gender} onValueChange={(value: "female" | "male") => setQuote({ ...quote, gender: value })}>
                <SelectTrigger data-testid="select-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Term">
              <Select value={String(quote.termLength)} onValueChange={(value) => setQuote({ ...quote, termLength: Number(value) })}>
                <SelectTrigger data-testid="select-term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 15, 20, 25, 30].map((term) => (
                    <SelectItem key={term} value={String(term)}>
                      {term} years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Health class">
            <Select value={quote.healthClass} onValueChange={(value: QuoteRequest["healthClass"]) => setQuote({ ...quote, healthClass: value })}>
              <SelectTrigger data-testid="select-health">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preferred-plus">Preferred Plus</SelectItem>
                <SelectItem value="preferred">Preferred</SelectItem>
                <SelectItem value="standard-plus">Standard Plus</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex min-h-12 items-center justify-between rounded-xl border border-border p-3" data-testid="checkbox-tobacco-row">
            <span>
              <span className="block text-sm font-medium">Tobacco use</span>
              <span className="block text-xs text-muted-foreground">Applies tobacco pricing multiplier.</span>
            </span>
            <Checkbox checked={quote.tobacco} onCheckedChange={(checked) => setQuote({ ...quote, tobacco: Boolean(checked) })} data-testid="checkbox-tobacco" />
          </label>
        </CardContent>
      </Card>
      <Button className="h-12 w-full rounded-full" onClick={onSubmit} disabled={loading} data-testid="button-run-quotes">
        {loading ? "Checking carriers..." : "Compare quotes"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </section>
  );
}

function QuoteCard({ option, selected, onSelect }: { option: QuoteOption; selected: boolean; onSelect: () => void }) {
  return (
    <Card className={cn("overflow-hidden transition", selected && "border-primary bg-primary/5")} data-testid={`card-quote-${option.quoteId}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{option.carrierName}</h2>
            <p className="text-xs text-muted-foreground">{option.productName}</p>
          </div>
          <Badge variant={selected ? "default" : "secondary"}>{option.amBestRating}</Badge>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums">{money(option.monthlyPremium)}</p>
            <p className="text-xs text-muted-foreground">per month, simulated</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{option.fitScore}</p>
            <p className="text-xs text-muted-foreground">fit score</p>
          </div>
        </div>
        <div className="space-y-2">
          {option.highlights.slice(0, 2).map((item) => (
            <p key={item} className="flex gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
              <span>{item}</span>
            </p>
          ))}
        </div>
        <Button className="w-full rounded-full" variant={selected ? "default" : "outline"} onClick={onSelect} data-testid={`button-select-${option.quoteId}`}>
          {selected ? "Selected" : "Select quote"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Results({
  response,
  selected,
  setSelected,
  onContinue,
}: {
  response?: QuoteResponse;
  selected?: QuoteOption;
  setSelected: (option: QuoteOption) => void;
  onContinue: () => void;
}) {
  if (!response) return null;
  return (
    <section className="space-y-5">
      <div>
        <Badge variant="secondary" className="rounded-full">
          {response.summary.returnedQuotes} quote paths
        </Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.03em]">Choose your coverage</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sorted by monthly premium with AM Best rating and conversion notes.</p>
      </div>
      <div className="grid gap-3">
        {response.options.slice(0, 8).map((option) => (
          <QuoteCard key={option.quoteId} option={option} selected={selected?.quoteId === option.quoteId} onSelect={() => setSelected(option)} />
        ))}
      </div>
      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 p-4 backdrop-blur">
        <Button className="h-12 w-full rounded-full" disabled={!selected} onClick={onContinue} data-testid="button-continue-selected">
          Continue with selected quote
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

function SelectedQuote({ selected, onContinue }: { selected?: QuoteOption; onContinue: () => void }) {
  if (!selected) return null;
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Lock this quote snapshot</h1>
        <p className="mt-2 text-sm text-muted-foreground">This package carries forward into application intake and agent assignment.</p>
      </div>
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            {selected.carrierName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background p-3">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="font-mono text-lg font-semibold">{money(selected.monthlyPremium)}</p>
            </div>
            <div className="rounded-xl bg-background p-3">
              <p className="text-xs text-muted-foreground">Annual</p>
              <p className="font-mono text-lg font-semibold">{money(selected.annualPremium)}</p>
            </div>
            <div className="rounded-xl bg-background p-3">
              <p className="text-xs text-muted-foreground">Product</p>
              <p className="text-sm font-semibold">{selected.productType}</p>
            </div>
            <div className="rounded-xl bg-background p-3">
              <p className="text-xs text-muted-foreground">AM Best</p>
              <p className="text-sm font-semibold">{selected.amBestRating}</p>
            </div>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Conversion</p>
            <p className="mt-1 text-sm">{selected.conversion}</p>
          </div>
        </CardContent>
      </Card>
      <Button className="h-12 w-full rounded-full" onClick={onContinue} data-testid="button-start-intake">
        Start application intake
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </section>
  );
}

function Intake({
  intake,
  setIntake,
  onContinue,
}: {
  intake: Omit<ApplicationIntake, "quoteId">;
  setIntake: (intake: Omit<ApplicationIntake, "quoteId">) => void;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Application intake</h1>
        <p className="mt-2 text-sm text-muted-foreground">This simulates the data package that would prefill FireLight or a carrier eApp.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <Field label="Legal name">
            <Input value={intake.legalName} onChange={(event) => setIntake({ ...intake, legalName: event.target.value })} data-testid="input-legal-name" />
          </Field>
          <Field label="Email">
            <Input value={intake.email} onChange={(event) => setIntake({ ...intake, email: event.target.value })} data-testid="input-email" />
          </Field>
          <Field label="Phone">
            <Input value={intake.phone} onChange={(event) => setIntake({ ...intake, phone: event.target.value })} data-testid="input-phone" />
          </Field>
          <Field label="Address">
            <Input value={intake.address} onChange={(event) => setIntake({ ...intake, address: event.target.value })} data-testid="input-address" />
          </Field>
          <Field label="Beneficiary">
            <Input value={intake.beneficiary} onChange={(event) => setIntake({ ...intake, beneficiary: event.target.value })} data-testid="input-beneficiary" />
          </Field>
          <Field label="Notes">
            <Textarea value={intake.notes} onChange={(event) => setIntake({ ...intake, notes: event.target.value })} data-testid="textarea-notes" />
          </Field>
        </CardContent>
      </Card>
      <Button className="h-12 w-full rounded-full" onClick={onContinue} data-testid="button-intake-continue">
        Continue to disclosures
      </Button>
    </section>
  );
}

function Disclosures({ accepted, setAccepted, onContinue }: { accepted: boolean; setAccepted: (accepted: boolean) => void; onContinue: () => void }) {
  const items = [
    "I understand quotes are estimates and final premiums depend on underwriting.",
    "I consent to receive required records and disclosures electronically in this prototype flow.",
    "I understand PolicyQuoters may assign my application packet to an eligible licensed agent.",
    "I understand this MVP simulates FireLight/carrier eApp handoff rather than submitting a live application.",
  ];
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em]">Review disclosures</h1>
        <p className="mt-2 text-sm text-muted-foreground">Production will require state-specific language and carrier-approved forms.</p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          {items.map((item) => (
            <p key={item} className="flex gap-2 text-sm leading-6">
              <FileText className="mt-1 h-4 w-4 flex-none text-primary" />
              <span>{item}</span>
            </p>
          ))}
        </CardContent>
      </Card>
      <label className="flex items-start gap-3 rounded-xl border border-border p-4" data-testid="checkbox-disclosure-row">
        <Checkbox checked={accepted} onCheckedChange={(checked) => setAccepted(Boolean(checked))} className="mt-1" data-testid="checkbox-disclosure" />
        <span className="text-sm leading-6">I have reviewed and accept the electronic consent and assignment disclosures.</span>
      </label>
      <Button className="h-12 w-full rounded-full" disabled={!accepted} onClick={onContinue} data-testid="button-disclosures-continue">
        Continue to e-sign
      </Button>
    </section>
  );
}

function Sign({
  signature,
  setSignature,
  onSubmit,
  loading,
}: {
  signature: string;
  setSignature: (signature: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em]">E-sign packet</h1>
        <p className="mt-2 text-sm text-muted-foreground">This simulates a signature ceremony and produces an assignment packet.</p>
      </div>
      <Card className="bg-card/90">
        <CardContent className="space-y-4 p-4">
          <div className="rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-5 text-center">
            <PenLine className="mx-auto h-7 w-7 text-primary" />
            <p className="mt-3 text-sm font-medium">Type your name to sign</p>
            <p className="mt-1 text-xs text-muted-foreground">Production would use a compliant signature provider or FireLight ceremony.</p>
          </div>
          <Field label="Signature">
            <Input value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Type legal name" data-testid="input-signature" />
          </Field>
        </CardContent>
      </Card>
      <Button className="h-12 w-full rounded-full" disabled={signature.length < 2 || loading} onClick={onSubmit} data-testid="button-submit-assignment">
        {loading ? "Assigning packet..." : "Sign and assign"}
        <ClipboardSignature className="ml-2 h-4 w-4" />
      </Button>
    </section>
  );
}

function Assigned({ selected, assignment }: { selected?: QuoteOption; assignment?: AssignmentResponse }) {
  return (
    <section className="space-y-5">
      <div className="rounded-3xl bg-primary p-6 text-primary-foreground">
        <CheckCircle2 className="h-9 w-9" />
        <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">Your packet is assigned</h1>
        <p className="mt-2 text-sm text-primary-foreground/80">The customer-facing journey is complete. The agent can now take over the application handoff.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <UserRoundCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">{assignment?.assignedAgent.name ?? "Licensed partner agent"}</p>
              <p className="text-xs text-muted-foreground">{assignment?.assignedAgent.agency ?? "PolicyQuoters network"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Selected carrier</p>
              <p className="text-sm font-semibold">{selected?.carrierName ?? "Pending"}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Next step</p>
              <p className="text-sm font-semibold">Application handoff</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Quote selected", "Intake complete", "Disclosures accepted", "Packet signed", "Agent assigned", "Application handoff ready"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

export default function MobileMvp() {
  const [step, setStep] = useState<Step>("welcome");
  const [quote, setQuote] = useState<QuoteRequest>(defaultQuote);
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | undefined>();
  const [selected, setSelected] = useState<QuoteOption | undefined>();
  const [intake, setIntake] = useState<Omit<ApplicationIntake, "quoteId">>(defaultIntake);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState(defaultIntake.legalName);
  const [assignment, setAssignment] = useState<AssignmentResponse | undefined>();

  const quoteMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/quotes", quote)).json() as Promise<QuoteResponse>,
    onSuccess: (data) => {
      setQuoteResponse(data);
      setSelected(data.options[0]);
      setStep("results");
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", "/api/assignments", {
        quoteId: selected?.quoteId,
        intake: { ...intake, quoteId: selected?.quoteId ?? "" },
        signatureName: signature,
        consentTimestamp: new Date().toISOString(),
      })).json() as Promise<AssignmentResponse>,
    onSuccess: (data) => {
      setAssignment(data);
      setStep("assigned");
    },
  });

  const back = () => {
    const current = steps.indexOf(step);
    setStep(steps[Math.max(0, current - 1)]);
  };

  const content = useMemo(() => {
    switch (step) {
      case "welcome":
        return <Welcome onStart={() => setStep("quote")} />;
      case "quote":
        return <QuoteBasics quote={quote} setQuote={setQuote} onSubmit={() => quoteMutation.mutate()} loading={quoteMutation.isPending} />;
      case "results":
        return <Results response={quoteResponse} selected={selected} setSelected={setSelected} onContinue={() => setStep("selected")} />;
      case "selected":
        return <SelectedQuote selected={selected} onContinue={() => setStep("intake")} />;
      case "intake":
        return <Intake intake={intake} setIntake={setIntake} onContinue={() => setStep("disclosures")} />;
      case "disclosures":
        return <Disclosures accepted={accepted} setAccepted={setAccepted} onContinue={() => setStep("sign")} />;
      case "sign":
        return <Sign signature={signature} setSignature={setSignature} onSubmit={() => assignmentMutation.mutate()} loading={assignmentMutation.isPending} />;
      case "assigned":
        return <Assigned selected={selected} assignment={assignment} />;
      default:
        return null;
    }
  }, [accepted, assignment, assignmentMutation.isPending, intake, quote, quoteMutation.isPending, quoteResponse, selected, signature, step]);

  return <Shell step={step} onBack={back}>{content}</Shell>;
}
