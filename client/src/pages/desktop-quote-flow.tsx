import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardSignature,
  FileText,
  HeartPulse,
  Home,
  Landmark,
  Lock,
  PenLine,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
  Award,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type {
  ApplicationIntake,
  AssignmentResponse,
  QuoteOption,
  QuoteRequest,
  QuoteResponse,
} from "@shared/schema";

type Stage =
  | "configure"
  | "results"
  | "selected"
  | "intake"
  | "disclosures"
  | "sign"
  | "confirmed";

const stageOrder: Stage[] = [
  "configure",
  "results",
  "selected",
  "intake",
  "disclosures",
  "sign",
  "confirmed",
];

const stageLabels: Record<Stage, string> = {
  configure: "Configure",
  results: "Compare carriers",
  selected: "Lock your quote",
  intake: "Application details",
  disclosures: "Review disclosures",
  sign: "Sign and submit",
  confirmed: "Handoff",
};

const lineTypes = [
  {
    id: "term-life",
    title: "Life Insurance",
    short: "Affordable death benefit coverage for a chosen term length.",
    learn:
      "Term life is usually the simplest way to get a large death benefit at a lower monthly premium. It is often used for income replacement, young families, and business protection.",
    bestFor: "Families, income replacement, business protection",
    icon: ShieldCheck,
    faceAmount: 750000,
  },
  {
    id: "iul",
    title: "IUL",
    short: "Permanent life insurance with index-linked cash value potential.",
    learn:
      "Indexed universal life can combine lifetime death benefit protection with cash value that may be credited based on a market index, subject to product caps, floors, fees, and carrier rules.",
    bestFor: "Permanent coverage, accumulation, legacy planning",
    icon: Sparkles,
    faceAmount: 500000,
  },
  {
    id: "mortgage-protection",
    title: "Mortgage Protection",
    short: "Coverage designed around a mortgage payoff need.",
    learn:
      "Mortgage protection is positioned to help a family keep the home or pay down the loan if the insured dies. It is typically quoted using term life coverage matched to the loan amount and years remaining.",
    bestFor: "Homeowners, loan payoff planning, family protection",
    icon: Home,
    faceAmount: 450000,
  },
  {
    id: "whole-life",
    title: "Whole Life",
    short: "Lifetime coverage with guaranteed cash value emphasis.",
    learn:
      "Whole life is permanent coverage designed to last for life when premiums are paid. It can include guarantees and cash value, but usually costs more than term coverage.",
    bestFor: "Lifetime guarantees, conservative planning, legacy goals",
    icon: HeartPulse,
    faceAmount: 250000,
  },
  {
    id: "universal-life",
    title: "Universal Life",
    short: "Flexible permanent coverage and premium design.",
    learn:
      "Universal life can provide permanent coverage with more premium and death-benefit flexibility than traditional whole life, depending on the product design and carrier.",
    bestFor: "Flexible permanent coverage, estate needs, business planning",
    icon: BadgeCheck,
    faceAmount: 500000,
  },
  {
    id: "final-expense",
    title: "Final Expense",
    short: "Smaller coverage for burial and final costs.",
    learn:
      "Final expense life insurance is usually smaller face-amount coverage intended to help with funeral, burial, and final bills. It may have simpler underwriting depending on the carrier.",
    bestFor: "Burial costs, seniors, smaller coverage needs",
    icon: FileText,
    faceAmount: 25000,
  },
  {
    id: "annuities",
    title: "Annuities",
    short: "Retirement accumulation and income options.",
    learn:
      "Annuities are not life insurance death benefit quotes; they are retirement products that can support accumulation, income, and principal-protection goals depending on the contract type.",
    bestFor: "Retirement income, accumulation, principal protection",
    icon: Landmark,
    faceAmount: 100000,
  },
] as const;

type LineTypeId = (typeof lineTypes)[number]["id"];

const websiteIntentMap: Record<string, LineTypeId> = {
  "life-insurance": "term-life",
  "term-life": "term-life",
  iul: "iul",
  "mortgage-protection": "mortgage-protection",
  "whole-life": "whole-life",
  "universal-life": "universal-life",
  "final-expense": "final-expense",
  annuities: "annuities",
};

const defaultQuote: QuoteRequest = {
  lineType: "term-life",
  faceAmount: 750000,
  age: 42,
  gender: "male",
  state: "NY",
  healthClass: "preferred",
  tobacco: false,
  termLength: 20,
};

const defaultIntake: Omit<ApplicationIntake, "quoteId"> = {
  legalName: "",
  email: "",
  phone: "",
  address: "",
  beneficiary: "",
  owner: "Insured owns the policy",
  annualIncome: 0,
  replacement: false,
  notes: "",
};

const stateOptions = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function moneyShort(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function readIntent(): LineTypeId {
  if (typeof window === "undefined") return "term-life";
  const search = new URLSearchParams(window.location.search);
  const raw = (search.get("intent") || search.get("line") || "").toLowerCase();
  return websiteIntentMap[raw] ?? "term-life";
}

function readBroker(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const search = new URLSearchParams(window.location.search);
  const value = search.get("broker");
  return value ? decodeURIComponent(value) : undefined;
}

function StageStepper({ stage }: { stage: Stage }) {
  const activeIndex = stageOrder.indexOf(stage);
  const progress = ((activeIndex + 1) / stageOrder.length) * 100;
  return (
    <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="rounded-full">
          Step {activeIndex + 1} of {stageOrder.length}
        </Badge>
        <p className="text-sm font-semibold tracking-[-0.02em]">{stageLabels[stage]}</p>
        <span className="ml-auto text-xs text-muted-foreground">
          Save your progress automatically as you continue
        </span>
      </div>
      <Progress value={progress} className="mt-4 h-1.5" />
      <ol className="mt-4 grid gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7" data-testid="stepper-stages">
        {stageOrder.map((stageId, index) => {
          const reached = index <= activeIndex;
          return (
            <li
              key={stageId}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5",
                reached && "border-primary/60 bg-primary/5 text-foreground",
              )}
              data-active={index === activeIndex}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold",
                  reached ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span className="truncate">{stageLabels[stageId]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function HeroSummary({
  selectedLine,
  onChangeLine,
  brokerName,
}: {
  selectedLine: (typeof lineTypes)[number];
  onChangeLine: () => void;
  brokerName?: string;
}) {
  const Icon = selectedLine.icon;
  return (
    <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="grid gap-4 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <Badge variant="outline" className="rounded-full">
              {brokerName ? `Suggested by ${brokerName}` : "Currently shopping"}
            </Badge>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{selectedLine.title} quotes</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{selectedLine.short}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="rounded-full lg:justify-self-end"
          onClick={onChangeLine}
          data-testid="button-change-line-desktop"
        >
          Change coverage type
        </Button>
      </CardContent>
    </Card>
  );
}

function LineGrid({
  activeLine,
  onSelect,
}: {
  activeLine: LineTypeId;
  onSelect: (line: (typeof lineTypes)[number]) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {lineTypes.map((line) => {
        const Icon = line.icon;
        const selected = activeLine === line.id;
        return (
          <Card
            key={line.id}
            className={cn(
              "h-full cursor-pointer border-border/80 transition hover:border-primary/60 hover:shadow-md",
              selected && "border-primary bg-primary/5",
            )}
            data-testid={`card-desktop-line-${line.id}`}
          >
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {selected ? <Badge className="rounded-full">Selected</Badge> : null}
              </div>
              <div>
                <h3 className="font-semibold tracking-[-0.02em]">{line.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{line.short}</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                <p className="font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Best for</p>
                <p className="mt-1 text-sm leading-5 text-foreground/80">{line.bestFor}</p>
              </div>
              <Button
                className="mt-auto rounded-full"
                variant={selected ? "default" : "outline"}
                onClick={() => onSelect(line)}
                data-testid={`button-desktop-pick-line-${line.id}`}
              >
                {selected ? "Continue with this option" : "Choose this coverage"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ConfigureStage({
  quote,
  setQuote,
  selectedLine,
  onPickLine,
  onSubmit,
  loading,
  brokerName,
}: {
  quote: QuoteRequest;
  setQuote: (quote: QuoteRequest) => void;
  selectedLine: (typeof lineTypes)[number];
  onPickLine: (line: (typeof lineTypes)[number]) => void;
  onSubmit: () => void;
  loading: boolean;
  brokerName?: string;
}) {
  const [openLineGrid, setOpenLineGrid] = useState(false);
  const amountLabel = selectedLine.id === "annuities" ? "Contribution amount" : "Coverage amount";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <HeroSummary
          selectedLine={selectedLine}
          onChangeLine={() => setOpenLineGrid((value) => !value)}
          brokerName={brokerName}
        />
        {openLineGrid ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Browse all coverage types</p>
                  <p className="text-xs text-muted-foreground">
                    Choose the option that fits your shopping goal. You can change this anytime.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setOpenLineGrid(false)}
                  data-testid="button-close-line-grid"
                >
                  Close
                </Button>
              </div>
              <LineGrid
                activeLine={quote.lineType}
                onSelect={(line) => {
                  onPickLine(line);
                  setOpenLineGrid(false);
                }}
              />
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg tracking-[-0.02em]">Tell us about you</CardTitle>
            <p className="text-sm text-muted-foreground">
              We use this to personalize the quotes you compare. None of this is bound to a final policy yet.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{amountLabel}</Label>
                <Input
                  type="number"
                  min={10000}
                  step={5000}
                  value={quote.faceAmount}
                  onChange={(event) =>
                    setQuote({ ...quote, faceAmount: Number(event.target.value) })
                  }
                  data-testid="input-desktop-face"
                />
                <p className="text-xs text-muted-foreground">
                  Compare different coverage levels to see how monthly premiums change.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Term length</Label>
                <Select
                  value={String(quote.termLength)}
                  onValueChange={(value) =>
                    setQuote({ ...quote, termLength: Number(value) })
                  }
                >
                  <SelectTrigger data-testid="select-desktop-term">
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
                <p className="text-xs text-muted-foreground">
                  Term controls how long the locked premium applies. Permanent coverage uses level pricing.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  min={18}
                  max={80}
                  value={quote.age}
                  onChange={(event) => setQuote({ ...quote, age: Number(event.target.value) })}
                  data-testid="input-desktop-age"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={quote.gender}
                  onValueChange={(value: "female" | "male") =>
                    setQuote({ ...quote, gender: value })
                  }
                >
                  <SelectTrigger data-testid="select-desktop-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={quote.state}
                  onValueChange={(value) => setQuote({ ...quote, state: value })}
                >
                  <SelectTrigger data-testid="select-desktop-state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Health class</Label>
                <Select
                  value={quote.healthClass}
                  onValueChange={(value: QuoteRequest["healthClass"]) =>
                    setQuote({ ...quote, healthClass: value })
                  }
                >
                  <SelectTrigger data-testid="select-desktop-health">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preferred-plus">Preferred Plus</SelectItem>
                    <SelectItem value="preferred">Preferred</SelectItem>
                    <SelectItem value="standard-plus">Standard Plus</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Carriers verify class during underwriting. Use a best-fit estimate for now.
                </p>
              </div>
              <label
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-4"
                data-testid="checkbox-desktop-tobacco-row"
              >
                <span>
                  <span className="block text-sm font-medium">Tobacco use</span>
                  <span className="block text-xs text-muted-foreground">
                    Tobacco use changes pricing on most carriers.
                  </span>
                </span>
                <Checkbox
                  checked={quote.tobacco}
                  onCheckedChange={(checked) => setQuote({ ...quote, tobacco: Boolean(checked) })}
                  data-testid="checkbox-desktop-tobacco"
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Quotes are estimates. Final premiums depend on carrier underwriting.
              </p>
              <Button
                size="lg"
                className="rounded-full"
                onClick={onSubmit}
                disabled={loading}
                data-testid="button-desktop-run-quotes"
              >
                {loading ? "Comparing carriers..." : "Compare carrier quotes"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle className="text-base">Why consumers shop with PolicyQuoters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {(
              [
                { text: "Compare 12+ A-rated carriers", Icon: Award },
                { text: "No login required to see quotes", Icon: ShieldCheck },
                { text: "Mobile-friendly handoff if you want to finish later", Icon: BadgeCheck },
                { text: "Optional licensed broker support after you choose", Icon: UserRoundCheck },
              ] as const
            ).map(({ text, Icon }) => (
              <div key={text} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About {selectedLine.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>{selectedLine.learn}</p>
            <div className="rounded-2xl bg-muted/60 p-3 text-xs">
              <p className="font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                What affects price
              </p>
              <p className="mt-1 text-sm leading-5 text-foreground/80">
                {selectedLine.id === "annuities"
                  ? "Contribution amount, income goals, state availability, carrier product design, surrender schedule, and selected riders."
                  : "Age, health class, tobacco use, state availability, coverage amount, term length, riders, and carrier underwriting rules."}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What happens after you compare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {[
              "Lock the carrier and product you like best.",
              "Provide application details on this same page.",
              "Sign electronically when you are ready.",
              "Get connected with a licensed broker who can finalize the carrier application.",
            ].map((item, index) => (
              <div key={item} className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultsStage({
  response,
  selected,
  setSelected,
  onContinue,
  onBack,
  selectedLine,
}: {
  response?: QuoteResponse;
  selected?: QuoteOption;
  setSelected: (option: QuoteOption) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLine: (typeof lineTypes)[number];
}) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  if (!response) return null;
  const options = response.options;

  const toggleCompare = (id: string) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 3) return [current[1], current[2], id];
      return [...current, id];
    });
  };

  const compareOptions = compareIds
    .map((id) => options.find((option) => option.quoteId === id))
    .filter((option): option is QuoteOption => Boolean(option));

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="grid gap-3 p-5 lg:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Lowest monthly
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {money(response.summary.lowestMonthlyPremium)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Carriers shown
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {response.summary.returnedQuotes}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Top recommendation
            </p>
            <p className="mt-1 truncate text-2xl font-semibold tracking-[-0.02em]">
              {response.summary.recommendedCarrier}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="outline" className="rounded-full">
                {selectedLine.title} matches
              </Badge>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Compare carriers side by side
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sorted by monthly premium. Tick up to three carriers to see them in the comparison panel.
              </p>
            </div>
            <Button variant="ghost" className="rounded-full" onClick={onBack} data-testid="button-results-back">
              Adjust details
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {options.map((option) => {
              const isSelected = selected?.quoteId === option.quoteId;
              const isCompared = compareIds.includes(option.quoteId);
              return (
                <Card
                  key={option.quoteId}
                  className={cn(
                    "h-full overflow-hidden transition",
                    isSelected && "border-primary bg-primary/5",
                  )}
                  data-testid={`card-desktop-quote-${option.quoteId}`}
                >
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold tracking-[-0.02em]">{option.carrierName}</h3>
                        <p className="text-xs text-muted-foreground">{option.productName}</p>
                      </div>
                      <Badge variant={isSelected ? "default" : "secondary"} className="rounded-full">
                        AM Best {option.amBestRating}
                      </Badge>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-3xl font-semibold tabular-nums">
                          {money(option.monthlyPremium)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          per month · {money(option.annualPremium)} annual
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold">{option.fitScore}</p>
                        <p className="text-xs text-muted-foreground">fit score</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs leading-5 text-muted-foreground">
                      {option.highlights.slice(0, 2).map((item) => (
                        <p key={item} className="flex gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                          <span>{item}</span>
                        </p>
                      ))}
                      <p className="flex gap-2">
                        <Layers className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                        <span>{option.conversion}</span>
                      </p>
                    </div>
                    <div className="mt-auto grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        className={cn("rounded-full", isCompared && "border-primary text-primary")}
                        onClick={() => toggleCompare(option.quoteId)}
                        data-testid={`button-desktop-compare-${option.quoteId}`}
                      >
                        {isCompared ? "Added to compare" : "Add to compare"}
                      </Button>
                      <Button
                        className="rounded-full"
                        variant={isSelected ? "default" : "secondary"}
                        onClick={() => setSelected(option)}
                        data-testid={`button-desktop-select-${option.quoteId}`}
                      >
                        {isSelected ? "Selected" : "Select quote"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selected ? (
                <>
                  <div>
                    <p className="font-semibold">{selected.carrierName}</p>
                    <p className="text-xs text-muted-foreground">{selected.productName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Monthly</p>
                      <p className="font-mono text-lg font-semibold">{money(selected.monthlyPremium)}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Annual</p>
                      <p className="font-mono text-lg font-semibold">{money(selected.annualPremium)}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full rounded-full"
                    onClick={onContinue}
                    data-testid="button-desktop-continue-selected"
                  >
                    Continue with this quote
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pick a carrier on the left to see selection details and continue.
                </p>
              )}
            </CardContent>
          </Card>
          {compareOptions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Side-by-side comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {compareOptions.map((option) => (
                  <div
                    key={option.quoteId}
                    className="rounded-2xl border border-border bg-background p-3"
                    data-testid={`row-compare-${option.quoteId}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{option.carrierName}</p>
                      <Badge variant="secondary" className="rounded-full">
                        {option.amBestRating}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{option.productName}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Monthly
                        </p>
                        <p className="font-mono text-sm font-semibold">{money(option.monthlyPremium)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Annual
                        </p>
                        <p className="font-mono text-sm font-semibold">{moneyShort(option.annualPremium)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Fit</p>
                        <p className="font-mono text-sm font-semibold">{option.fitScore}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{option.conversion}</p>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full rounded-full"
                  onClick={() => setCompareIds([])}
                  data-testid="button-clear-compare"
                >
                  Clear comparison
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <Card className="bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Shopping tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
              <p>
                <TrendingUp className="mr-2 inline h-3.5 w-3.5 text-primary" />
                Higher AM Best ratings reflect financial strength, but premium and product fit still matter.
              </p>
              <p>
                <Star className="mr-2 inline h-3.5 w-3.5 text-primary" />
                Conversion language matters if you want the option to switch to permanent coverage later.
              </p>
              <p>
                <ShieldCheck className="mr-2 inline h-3.5 w-3.5 text-primary" />
                Final premiums always depend on the carrier&apos;s underwriting of your application.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SelectedStage({
  selected,
  selectedLine,
  onContinue,
  onBack,
  brokerName,
}: {
  selected?: QuoteOption;
  selectedLine: (typeof lineTypes)[number];
  onContinue: () => void;
  onBack: () => void;
  brokerName?: string;
}) {
  if (!selected) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            Selected quote
          </Badge>
          <CardTitle className="mt-2 flex items-center gap-2 text-2xl tracking-[-0.04em]">
            <Lock className="h-5 w-5 text-primary" />
            {selected.carrierName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{selected.productName}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="font-mono text-xl font-semibold">{money(selected.monthlyPremium)}</p>
            </div>
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Annual</p>
              <p className="font-mono text-xl font-semibold">{money(selected.annualPremium)}</p>
            </div>
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Product</p>
              <p className="text-sm font-semibold">{selected.productType}</p>
            </div>
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">AM Best</p>
              <p className="text-sm font-semibold">{selected.amBestRating}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Conversion language
            </p>
            <p className="mt-1 text-sm leading-6">{selected.conversion}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Coverage notes
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {selected.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" className="rounded-full" onClick={onBack} data-testid="button-selected-back">
              Back to comparison
            </Button>
            <Button className="rounded-full" onClick={onContinue} data-testid="button-desktop-start-intake">
              Continue to application details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What you&apos;re locking in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              You can still adjust application details on the next step. The carrier and product
              choice carries through to the licensed broker who completes your application.
            </p>
            <p>
              {brokerName
                ? `${brokerName} will be notified once you sign so they can prepare your application.`
                : "We pair you with a licensed broker after you sign so they can finalize the carrier application with you."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selectedLine.title} reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>{selectedLine.learn}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IntakeStage({
  intake,
  setIntake,
  onContinue,
  onBack,
  selected,
}: {
  intake: Omit<ApplicationIntake, "quoteId">;
  setIntake: (intake: Omit<ApplicationIntake, "quoteId">) => void;
  onContinue: () => void;
  onBack: () => void;
  selected?: QuoteOption;
}) {
  const valid =
    intake.legalName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(intake.email) &&
    intake.phone.replace(/\D/g, "").length >= 10 &&
    intake.address.trim().length >= 5 &&
    intake.beneficiary.trim().length >= 2;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            Application details
          </Badge>
          <CardTitle className="mt-2 text-2xl tracking-[-0.04em]">Tell the carrier who you are</CardTitle>
          <p className="text-sm text-muted-foreground">
            This information feeds the application packet. It is shared only with the licensed broker
            who completes your application with the carrier.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Legal name</Label>
              <Input
                value={intake.legalName}
                onChange={(event) => setIntake({ ...intake, legalName: event.target.value })}
                placeholder="Full legal name"
                data-testid="input-desktop-legal-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={intake.email}
                onChange={(event) => setIntake({ ...intake, email: event.target.value })}
                placeholder="you@example.com"
                data-testid="input-desktop-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={intake.phone}
                onChange={(event) => setIntake({ ...intake, phone: event.target.value })}
                placeholder="(555) 555-0100"
                data-testid="input-desktop-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Annual income</Label>
              <Input
                type="number"
                min={0}
                value={intake.annualIncome || ""}
                onChange={(event) =>
                  setIntake({ ...intake, annualIncome: Number(event.target.value || 0) })
                }
                placeholder="$"
                data-testid="input-desktop-income"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Home address</Label>
            <Input
              value={intake.address}
              onChange={(event) => setIntake({ ...intake, address: event.target.value })}
              placeholder="Street, city, state, ZIP"
              data-testid="input-desktop-address"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary beneficiary</Label>
              <Input
                value={intake.beneficiary}
                onChange={(event) => setIntake({ ...intake, beneficiary: event.target.value })}
                placeholder="Spouse, child, trust"
                data-testid="input-desktop-beneficiary"
              />
            </div>
            <div className="space-y-2">
              <Label>Policy owner</Label>
              <Input
                value={intake.owner}
                onChange={(event) => setIntake({ ...intake, owner: event.target.value })}
                placeholder="Insured owns the policy"
                data-testid="input-desktop-owner"
              />
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-border p-4">
            <Checkbox
              checked={intake.replacement}
              onCheckedChange={(checked) =>
                setIntake({ ...intake, replacement: Boolean(checked) })
              }
              className="mt-1"
              data-testid="checkbox-desktop-replacement"
            />
            <span className="text-sm leading-6">
              This coverage will replace an existing life insurance policy. We&apos;ll have your broker
              walk through replacement disclosures with you.
            </span>
          </label>
          <div className="space-y-2">
            <Label>Notes for your broker (optional)</Label>
            <Textarea
              value={intake.notes ?? ""}
              onChange={(event) => setIntake({ ...intake, notes: event.target.value })}
              placeholder="Anything they should know before reaching out"
              data-testid="textarea-desktop-notes"
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <Button variant="outline" className="rounded-full" onClick={onBack} data-testid="button-intake-back">
              Back to selected quote
            </Button>
            <Button
              className="rounded-full"
              onClick={onContinue}
              disabled={!valid}
              data-testid="button-desktop-intake-continue"
            >
              Continue to disclosures
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your selected coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selected ? (
              <>
                <p className="font-semibold">{selected.carrierName}</p>
                <p className="text-xs text-muted-foreground">{selected.productName}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="font-mono text-lg font-semibold">{money(selected.monthlyPremium)}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Annual</p>
                    <p className="font-mono text-lg font-semibold">{money(selected.annualPremium)}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No selection yet.</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Privacy and security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
            <p>
              <Lock className="mr-2 inline h-3.5 w-3.5 text-primary" />
              Your information is shared only with the licensed broker assigned to your application.
            </p>
            <p>
              <ShieldCheck className="mr-2 inline h-3.5 w-3.5 text-primary" />
              We never sell consumer data and we don&apos;t use shopping details for marketing email lists.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DisclosuresStage({
  accepted,
  setAccepted,
  onContinue,
  onBack,
}: {
  accepted: boolean;
  setAccepted: (accepted: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const items = [
    "I understand quotes are estimates and final premiums depend on underwriting.",
    "I consent to receive required records and disclosures electronically.",
    "I understand PolicyQuoters may connect my application to a licensed broker who can finalize the carrier application with me.",
    "I understand carrier underwriting may request medical history, identification, and additional information.",
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            Disclosures
          </Badge>
          <CardTitle className="mt-2 text-2xl tracking-[-0.04em]">Review consumer disclosures</CardTitle>
          <p className="text-sm text-muted-foreground">
            Production sites use carrier-approved language and state-specific disclosures. Read each
            statement before continuing.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl border border-border bg-card/60 p-4">
              <FileText className="mt-1 h-4 w-4 flex-none text-primary" />
              <p className="text-sm leading-6 text-foreground/90">{item}</p>
            </div>
          ))}
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
            <Checkbox
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(Boolean(checked))}
              className="mt-1"
              data-testid="checkbox-desktop-disclosure"
            />
            <span className="text-sm leading-6">
              I have reviewed and accept the electronic consent and licensed-broker assignment
              disclosures.
            </span>
          </label>
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <Button variant="outline" className="rounded-full" onClick={onBack} data-testid="button-disclosures-back">
              Back to application details
            </Button>
            <Button
              className="rounded-full"
              onClick={onContinue}
              disabled={!accepted}
              data-testid="button-desktop-disclosures-continue"
            >
              Continue to e-sign
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What licensed support means</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            After you sign, a licensed broker is matched to your selected quote. They handle the
            carrier application, medical follow-ups, and policy delivery on your behalf.
          </p>
          <p>
            You can still ask questions, change carriers before underwriting completes, or pause
            and return later from any device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SignStage({
  signature,
  setSignature,
  onSubmit,
  onBack,
  loading,
  intake,
  selected,
}: {
  signature: string;
  setSignature: (signature: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  intake: Omit<ApplicationIntake, "quoteId">;
  selected?: QuoteOption;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            E-sign
          </Badge>
          <CardTitle className="mt-2 text-2xl tracking-[-0.04em]">Sign and submit your packet</CardTitle>
          <p className="text-sm text-muted-foreground">
            We&apos;ll bundle your selected quote, application details, and accepted disclosures into a
            packet for the licensed broker who finalizes your application.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-6 text-center">
            <PenLine className="mx-auto h-7 w-7 text-primary" />
            <p className="mt-3 text-sm font-semibold">Type your full legal name to sign</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Production carriers use a compliant signature ceremony. This step simulates that.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              placeholder="Type legal name as it appears above"
              data-testid="input-desktop-signature"
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <Button variant="outline" className="rounded-full" onClick={onBack} data-testid="button-sign-back">
              Back to disclosures
            </Button>
            <Button
              className="rounded-full"
              onClick={onSubmit}
              disabled={signature.trim().length < 2 || loading}
              data-testid="button-desktop-submit-assignment"
            >
              {loading ? "Submitting packet..." : "Sign and submit packet"}
              <ClipboardSignature className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Packet summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
          {selected ? (
            <div>
              <p className="font-semibold text-foreground">{selected.carrierName}</p>
              <p className="text-xs text-muted-foreground">{selected.productName}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                {money(selected.monthlyPremium)} / month
              </p>
            </div>
          ) : null}
          <div className="rounded-2xl bg-muted/60 p-3 text-xs">
            <p className="font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              Application details on file
            </p>
            <p className="mt-1 text-sm leading-5 text-foreground/80">
              {intake.legalName || "—"}
              <br />
              {intake.email || "—"} · {intake.phone || "—"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfirmedStage({
  selected,
  assignment,
  selectedLine,
}: {
  selected?: QuoteOption;
  assignment?: AssignmentResponse;
  selectedLine: (typeof lineTypes)[number];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <Badge className="rounded-full">Application packet submitted</Badge>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Your {selectedLine.title} packet is on its way
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                A licensed broker will reach out to walk through the carrier application with you.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Selected carrier</p>
              <p className="text-sm font-semibold">{selected?.carrierName ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{selected?.productName ?? ""}</p>
            </div>
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Premium snapshot</p>
              <p className="font-mono text-lg font-semibold">
                {selected ? money(selected.monthlyPremium) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">per month, simulated</p>
            </div>
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Licensed broker</p>
              <p className="text-sm font-semibold">{assignment?.assignedAgent.name ?? "Licensed partner"}</p>
              <p className="text-xs text-muted-foreground">
                {assignment?.assignedAgent.agency ?? "PolicyQuoters network"}
              </p>
            </div>
            <div className="rounded-2xl bg-background p-4">
              <p className="text-xs text-muted-foreground">Reachable at</p>
              <p className="text-sm font-semibold">{assignment?.assignedAgent.phone ?? "Coming via email"}</p>
              <p className="text-xs text-muted-foreground">Expect outreach within one business day.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" className="rounded-full" data-testid="button-confirm-home">
              <Link href="/">Back to PolicyQuoters home</Link>
            </Button>
            <Button asChild className="rounded-full" data-testid="button-confirm-directory">
              <Link href="/directory">Browse the broker directory</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Quote selected",
            "Application details captured",
            "Disclosures accepted",
            "Packet signed",
            "Licensed broker matched",
            "Carrier application handoff prepared",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DesktopQuoteFlow() {
  const [, navigate] = useLocation();
  const initialIntent = useMemo(() => readIntent(), []);
  const initialBroker = useMemo(() => readBroker(), []);
  const initialLine = lineTypes.find((line) => line.id === initialIntent) ?? lineTypes[0];

  const [stage, setStage] = useState<Stage>("configure");
  const [quote, setQuote] = useState<QuoteRequest>({
    ...defaultQuote,
    lineType: initialLine.id,
    faceAmount: initialLine.faceAmount,
    termLength: initialLine.id === "annuities" ? 10 : defaultQuote.termLength,
  });
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | undefined>();
  const [selected, setSelected] = useState<QuoteOption | undefined>();
  const [intake, setIntake] = useState<Omit<ApplicationIntake, "quoteId">>(defaultIntake);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState("");
  const [assignment, setAssignment] = useState<AssignmentResponse | undefined>();
  const [brokerName] = useState<string | undefined>(initialBroker);

  const selectedLine = lineTypes.find((line) => line.id === quote.lineType) ?? lineTypes[0];

  useEffect(() => {
    document.title = `Get ${selectedLine.title} Quotes Online | PolicyQuoters`;
    const description = `Compare ${selectedLine.title.toLowerCase()} quotes from top carriers, lock in your selection, and connect with a licensed broker — all on desktop.`;
    let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.content = description;
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://www.policyquoters.com/quotes";
  }, [selectedLine.title]);

  const quoteMutation = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", "/api/quotes", quote)).json() as Promise<QuoteResponse>,
    onSuccess: (data) => {
      setQuoteResponse(data);
      setSelected(data.options[0]);
      setStage("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: async () =>
      (
        await apiRequest("POST", "/api/assignments", {
          quoteId: selected?.quoteId,
          intake: { ...intake, quoteId: selected?.quoteId ?? "" },
          selectedQuote: selected,
          quoteRequest: quote,
          signatureName: signature,
          consentTimestamp: new Date().toISOString(),
        })
      ).json() as Promise<AssignmentResponse>,
    onSuccess: (data) => {
      setAssignment(data);
      setStage("confirmed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const handlePickLine = (line: (typeof lineTypes)[number]) => {
    setQuote({
      ...quote,
      lineType: line.id,
      faceAmount: line.faceAmount,
      termLength: line.id === "annuities" ? 10 : quote.termLength || defaultQuote.termLength,
    });
  };

  const goToStage = (next: Stage) => {
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Badge variant="outline" className="rounded-full">
          Online quote experience
        </Badge>
        <h1 className="text-4xl font-bold tracking-[-0.06em] sm:text-5xl">
          {stage === "confirmed"
            ? "Your application packet is locked in"
            : `Get ${selectedLine.title.toLowerCase()} quotes built for desktop.`}
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Compare carriers side by side, configure coverage, and complete your application in a
          full-page workflow designed for laptops and big screens.
        </p>
      </header>
      <StageStepper stage={stage} />
      {stage === "configure" ? (
        <ConfigureStage
          quote={quote}
          setQuote={setQuote}
          selectedLine={selectedLine}
          onPickLine={handlePickLine}
          onSubmit={() => quoteMutation.mutate()}
          loading={quoteMutation.isPending}
          brokerName={brokerName}
        />
      ) : null}
      {stage === "results" ? (
        <ResultsStage
          response={quoteResponse}
          selected={selected}
          setSelected={setSelected}
          onContinue={() => goToStage("selected")}
          onBack={() => goToStage("configure")}
          selectedLine={selectedLine}
        />
      ) : null}
      {stage === "selected" ? (
        <SelectedStage
          selected={selected}
          selectedLine={selectedLine}
          onContinue={() => goToStage("intake")}
          onBack={() => goToStage("results")}
          brokerName={brokerName}
        />
      ) : null}
      {stage === "intake" ? (
        <IntakeStage
          intake={intake}
          setIntake={setIntake}
          onContinue={() => goToStage("disclosures")}
          onBack={() => goToStage("selected")}
          selected={selected}
        />
      ) : null}
      {stage === "disclosures" ? (
        <DisclosuresStage
          accepted={accepted}
          setAccepted={setAccepted}
          onContinue={() => goToStage("sign")}
          onBack={() => goToStage("intake")}
        />
      ) : null}
      {stage === "sign" ? (
        <SignStage
          signature={signature}
          setSignature={setSignature}
          onSubmit={() => assignmentMutation.mutate()}
          onBack={() => goToStage("disclosures")}
          loading={assignmentMutation.isPending}
          intake={intake}
          selected={selected}
        />
      ) : null}
      {stage === "confirmed" ? (
        <ConfirmedStage
          selected={selected}
          assignment={assignment}
          selectedLine={selectedLine}
        />
      ) : null}
      {stage === "configure" ? (
        <section className="space-y-4 rounded-3xl border border-border bg-card/70 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">
                Browse coverage types
              </Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                Not sure which coverage fits?
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Pick a category to swap the form above to the right defaults. Each option highlights
                what it&apos;s designed for so you can shop with confidence.
              </p>
            </div>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => navigate("/directory")}
              data-testid="button-quote-browse-directory"
            >
              Browse broker directory
            </Button>
          </div>
          <LineGrid activeLine={quote.lineType} onSelect={handlePickLine} />
        </section>
      ) : null}
    </div>
  );
}
