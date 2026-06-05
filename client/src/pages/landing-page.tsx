import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  coverageTier,
  initMetaPixel,
  newEventId,
  trackCustomEvent,
  trackStandardEvent,
} from "@/lib/meta-pixel";
import { trackGaEvent } from "@/lib/ga";
import type {
  LandingContact,
  LandingPagePublic,
  LandingQuoteAnswers,
  LandingQuoteOption,
  LandingQuoteResponse,
} from "@shared/schema";

type Step =
  | "age"
  | "gender"
  | "state"
  | "coverage"
  | "smoker"
  | "health"
  | "contact"
  | "results"
  | "thanks";

type Answers = Partial<LandingQuoteAnswers>;
type Contact = Partial<Omit<LandingContact, "consent">> & { consent?: boolean };

const stepOrder: Step[] = ["age", "gender", "state", "coverage", "smoker", "health", "contact", "results", "thanks"];

const coverageChoices = [100_000, 250_000, 500_000, 750_000, 1_000_000, 1_500_000];
const ageBuckets: Array<{ label: string; value: number }> = [
  { label: "18–29", value: 25 },
  { label: "30–39", value: 34 },
  { label: "40–49", value: 44 },
  { label: "50–59", value: 54 },
  { label: "60–69", value: 64 },
  { label: "70–79", value: 74 },
];
const healthOptions: Array<{ value: LandingQuoteAnswers["health"]; label: string; description: string }> = [
  { value: "excellent", label: "Excellent", description: "Athletic, no medications, no medical issues." },
  { value: "great", label: "Great", description: "Healthy weight, occasional minor issues." },
  { value: "good", label: "Good", description: "Generally healthy, well-managed conditions." },
  { value: "fair", label: "Fair", description: "Some chronic conditions or treatments." },
  { value: "poor", label: "Poor", description: "Multiple conditions or recent serious treatment." },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function premium(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-9 w-9 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold leading-none">PolicyQuoters</p>
        <p className="text-xs text-muted-foreground">Licensed agent network</p>
      </div>
    </Link>
  );
}

function StepProgress({ current }: { current: Step }) {
  const totalIndex = stepOrder.indexOf("results");
  const currentIndex = Math.min(stepOrder.indexOf(current), totalIndex);
  const percent = Math.max(6, Math.round((currentIndex / totalIndex) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

function ChoiceCard({ selected, onClick, children, testId, title, description }: { selected?: boolean; onClick: () => void; children?: React.ReactNode; testId?: string; title: string; description?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary hover:bg-primary/5",
        selected ? "border-primary bg-primary/10" : "border-border",
      )}
    >
      <span>
        <span className="block text-base font-semibold">{title}</span>
        {description ? <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-primary">
        {selected ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
      </span>
      {children}
    </button>
  );
}

function QuestionFrame({
  step,
  title,
  subtitle,
  onBack,
  children,
}: {
  step: Step;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-3">
          <StepProgress current={step} />
          <div className="flex items-center justify-between">
            {onBack ? (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={onBack} data-testid={`button-back-${step}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Step {stepOrder.indexOf(step) + 1}</span>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid={`heading-${step}`}>{title}</h1>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="space-y-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function StateGrid({ allowed, selected, onSelect }: { allowed: string[]; selected?: string; onSelect: (state: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {allowed.map((state) => (
        <button
          key={state}
          type="button"
          data-testid={`button-state-${state}`}
          onClick={() => onSelect(state)}
          className={cn(
            "rounded-xl border bg-card p-3 text-center text-sm font-medium transition hover:border-primary hover:bg-primary/10",
            selected === state ? "border-primary bg-primary/10 text-primary" : "border-border",
          )}
        >
          {state}
        </button>
      ))}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  testId,
  name,
  id,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  testId: string;
  name?: string;
  id?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url" | "none";
}) {
  return (
    <label htmlFor={id} className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        name={name}
        id={id}
        autoComplete={autoComplete}
        inputMode={inputMode}
        data-testid={testId}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function ResultsCards({
  response,
  onSelect,
  selecting,
  selectedId,
}: {
  response: LandingQuoteResponse;
  onSelect: (option: LandingQuoteOption) => void;
  selecting: boolean;
  selectedId?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>
          {response.options.length} quote{response.options.length === 1 ? "" : "s"} from licensed carriers your agent is appointed with.
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {response.source === "hexure" ? "Powered by Hexure sandbox" : "Sandbox preview pricing"}
        </span>
      </div>
      {response.options.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No quotes available for your answers right now. Your agent will reach out to discuss options.</CardContent></Card>
      ) : null}
      {response.options.map((option) => {
        const isSelected = selectedId === option.quoteId;
        return (
          <Card key={option.quoteId} className={cn("border-border/80 bg-card", isSelected && "border-primary ring-2 ring-primary/30")}>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{option.carrierName}</p>
                  <p className="text-xs text-muted-foreground">{option.productName}</p>
                </div>
                {option.amBestRating ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">AM Best {option.amBestRating}</span>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-muted p-2">
                  <p className="text-muted-foreground">Monthly</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{premium(option.monthlyPremium)}</p>
                </div>
                <div className="rounded-xl bg-muted p-2">
                  <p className="text-muted-foreground">Coverage</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{money(option.coverageAmount)}</p>
                </div>
                <div className="rounded-xl bg-muted p-2">
                  <p className="text-muted-foreground">Term</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{option.termLength}-yr</p>
                </div>
              </div>
              <Button
                className="w-full rounded-full"
                disabled={selecting}
                onClick={() => onSelect(option)}
                data-testid={`button-select-${option.quoteId}`}
              >
                {selecting && isSelected ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Select this quote
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function LandingPageView() {
  const [, params] = useRoute<{ slug: string }>("/lp/:slug");
  const slug = params?.slug ?? "";

  const [step, setStep] = useState<Step>("age");
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<Contact>({});
  const [response, setResponse] = useState<LandingQuoteResponse | undefined>();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const { data: landingPage, isLoading, isError, error } = useQuery<LandingPagePublic>({
    queryKey: [`/api/landing-pages/${slug}`],
    enabled: Boolean(slug),
  });

  const loadErrorMessage = (() => {
    if (!isError && landingPage) return undefined;
    const raw = (error as Error | undefined)?.message ?? "";
    if (raw.startsWith("404")) return `We couldn't find a landing page at /lp/${slug}. It may have been removed or paused.`;
    if (raw) return `We couldn't load this landing page (${raw}). Please try again in a moment.`;
    return undefined;
  })();

  useEffect(() => {
    if (slug) {
      document.title = `Get quotes | PolicyQuoters`;
    }
  }, [slug]);

  const pagePixelId = landingPage?.metaPixelId;
  const viewContentSentRef = useRef(false);
  const quoteStartedSentRef = useRef(false);
  const eventIdsRef = useRef<{ lead?: string; quotesGenerated?: string; quoteSelected?: string }>({});

  useEffect(() => {
    if (!landingPage) return;
    initMetaPixel(pagePixelId);
    if (viewContentSentRef.current) return;
    viewContentSentRef.current = true;
    trackStandardEvent(
      "ViewContent",
      {
        content_category: "landing_page",
        content_name: landingPage.name,
        landing_page_slug: landingPage.slug,
        landing_page_id: landingPage.id,
        product_type: "life_insurance",
        licensed_state_count: landingPage.licensedStates.length,
        licensed_carrier_count: landingPage.licensedCarriers.length,
      },
      { pixelId: pagePixelId, eventId: newEventId("vc") },
    );
    trackGaEvent("landing_page_viewed", {
      landing_page_slug: landingPage.slug,
      landing_page_id: landingPage.id,
      product_type: "life_insurance",
      licensed_state_count: landingPage.licensedStates.length,
      licensed_carrier_count: landingPage.licensedCarriers.length,
    });
  }, [landingPage, pagePixelId]);

  const allowedStates = useMemo(() => landingPage?.licensedStates ?? [], [landingPage]);

  const trackQuoteStarted = () => {
    if (quoteStartedSentRef.current || !landingPage) return;
    quoteStartedSentRef.current = true;
    trackCustomEvent(
      "QuoteStarted",
      {
        landing_page_slug: landingPage.slug,
        landing_page_id: landingPage.id,
        product_type: "life_insurance",
      },
      { pixelId: pagePixelId, eventId: newEventId("qs") },
    );
    trackGaEvent("quote_flow_started", {
      landing_page_slug: landingPage.slug,
      landing_page_id: landingPage.id,
      product_type: "life_insurance",
    });
  };

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        slug,
        answers: answers as LandingQuoteAnswers,
        contact: { ...contact, consent: true } as LandingContact,
      };
      // Lead event fires at submission (no PII — only non-PII funnel signals).
      const leadEventId = newEventId("lead");
      eventIdsRef.current.lead = leadEventId;
      trackStandardEvent(
        "Lead",
        {
          landing_page_slug: landingPage?.slug,
          landing_page_id: landingPage?.id,
          product_type: "life_insurance",
          state: answers.state,
          coverage_amount: answers.coverageAmount,
          coverage_tier: coverageTier(answers.coverageAmount),
          smoker: answers.smoker,
          health_class: answers.health,
          gender: answers.gender,
          age_range: answers.ageRange,
        },
        { pixelId: pagePixelId, eventId: leadEventId },
      );
      trackGaEvent("quote_contact_submitted", {
        landing_page_slug: landingPage?.slug,
        landing_page_id: landingPage?.id,
        product_type: "life_insurance",
        state: answers.state,
        coverage_amount: answers.coverageAmount,
        coverage_tier: coverageTier(answers.coverageAmount),
        smoker: answers.smoker,
        health_class: answers.health,
        gender: answers.gender,
        age_range: answers.ageRange,
      });
      const res = await apiRequest("POST", "/api/landing-quotes", payload);
      return (await res.json()) as LandingQuoteResponse;
    },
    onSuccess: (data) => {
      setResponse(data);
      setStep("results");
      setErrorMessage(undefined);
      const quotesEventId = newEventId("qg");
      eventIdsRef.current.quotesGenerated = quotesEventId;
      trackCustomEvent(
        "QuotesGenerated",
        {
          landing_page_slug: landingPage?.slug,
          landing_page_id: landingPage?.id,
          product_type: "life_insurance",
          quotes_count: data.options.length,
          source: data.source,
          state: answers.state,
          coverage_amount: answers.coverageAmount,
          coverage_tier: coverageTier(answers.coverageAmount),
          smoker: answers.smoker,
          health_class: answers.health,
        },
        { pixelId: pagePixelId, eventId: quotesEventId },
      );
      trackGaEvent("quotes_generated", {
        landing_page_slug: landingPage?.slug,
        landing_page_id: landingPage?.id,
        product_type: "life_insurance",
        quotes_count: data.options.length,
        source: data.source,
        state: answers.state,
        coverage_amount: answers.coverageAmount,
        coverage_tier: coverageTier(answers.coverageAmount),
        smoker: answers.smoker,
        health_class: answers.health,
      });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Could not generate quotes. Please try again.");
    },
  });

  const selectMutation = useMutation({
    mutationFn: async (option: LandingQuoteOption) => {
      setSelectedQuoteId(option.quoteId);
      const selectEventId = newEventId("qsel");
      eventIdsRef.current.quoteSelected = selectEventId;
      trackCustomEvent(
        "QuoteSelected",
        {
          landing_page_slug: landingPage?.slug,
          landing_page_id: landingPage?.id,
          product_type: option.productType,
          carrier_name: option.carrierName,
          product_name: option.productName,
          coverage_amount: option.coverageAmount,
          coverage_tier: coverageTier(option.coverageAmount),
          term_length: option.termLength,
          monthly_premium: option.monthlyPremium,
          annual_premium: option.annualPremium,
          source: option.source,
        },
        { pixelId: pagePixelId, eventId: selectEventId },
      );
      trackGaEvent("quote_selected", {
        landing_page_slug: landingPage?.slug,
        landing_page_id: landingPage?.id,
        product_type: option.productType,
        carrier_name: option.carrierName,
        product_name: option.productName,
        coverage_amount: option.coverageAmount,
        coverage_tier: coverageTier(option.coverageAmount),
        term_length: option.termLength,
        monthly_premium: option.monthlyPremium,
        annual_premium: option.annualPremium,
        source: option.source,
      });
      const res = await apiRequest("POST", "/api/landing-quotes/select", {
        submissionId: response?.submissionId,
        selectedQuoteId: option.quoteId,
      });
      return res.json();
    },
    onSuccess: () => {
      setStep("thanks");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "We couldn't reserve that quote. Try a different option.");
    },
  });

  if (!slug) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-base font-semibold">No landing page specified.</p>
            <p className="text-sm text-muted-foreground">Open a landing page link in the format /lp/&lt;slug&gt;.</p>
            <Button asChild className="rounded-full"><Link href="/">Return home</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading landing page…</p>
      </main>
    );
  }

  if (isError || !landingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <Card>
          <CardContent className="space-y-3 p-6 text-center" data-testid="landing-page-error">
            <p className="text-base font-semibold">This page isn&apos;t available right now.</p>
            <p className="text-sm text-muted-foreground">
              {loadErrorMessage ?? `The landing page at /lp/${slug} could not be found or is paused. Double-check the link or contact the agent who shared it.`}
            </p>
            <Button asChild className="rounded-full"><Link href="/">Return home</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const goBack = (target: Step) => () => {
    setErrorMessage(undefined);
    setStep(target);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_38rem),hsl(var(--background))] text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-primary" /> Secure quote
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-3xl border border-border bg-card/95 p-5 text-center sm:p-7" data-testid="landing-header">
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl" data-testid="landing-header-title">
            Compare Life Insurance Quotes
          </h1>
          <p className="mx-auto mt-3 flex items-center justify-center gap-2 text-base font-medium text-foreground sm:text-lg" data-testid="landing-header-subtitle">
            <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
            Get quotes from up to 50+ A Rated Carriers
          </p>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-primary" data-testid="landing-header-instruction">
            Answer the questions below
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-landing-error">
            {errorMessage}
          </div>
        ) : null}

        {step === "age" && (
          <QuestionFrame step="age" title="What is your age range?" subtitle="We use this to estimate pricing. You can refine later.">
            {ageBuckets.map((bucket) => (
              <ChoiceCard
                key={bucket.label}
                title={bucket.label}
                description="Age range"
                selected={answers.ageRange === bucket.label}
                onClick={() => {
                  trackQuoteStarted();
                  setAnswers((prev) => ({ ...prev, ageRange: bucket.label, age: bucket.value }));
                  setStep("gender");
                }}
                testId={`button-age-${bucket.value}`}
              />
            ))}
          </QuestionFrame>
        )}

        {step === "gender" && (
          <QuestionFrame step="gender" title="What is your gender?" subtitle="Carriers price coverage differently for men and women." onBack={goBack("age")}>
            <ChoiceCard
              title="Female"
              selected={answers.gender === "female"}
              onClick={() => {
                setAnswers((prev) => ({ ...prev, gender: "female" }));
                setStep("state");
              }}
              testId="button-gender-female"
            />
            <ChoiceCard
              title="Male"
              selected={answers.gender === "male"}
              onClick={() => {
                setAnswers((prev) => ({ ...prev, gender: "male" }));
                setStep("state");
              }}
              testId="button-gender-male"
            />
          </QuestionFrame>
        )}

        {step === "state" && (
          <QuestionFrame step="state" title="What state do you live in?" subtitle={`Your agent is licensed in ${allowedStates.length} state${allowedStates.length === 1 ? "" : "s"}.`} onBack={goBack("gender")}>
            <StateGrid
              allowed={allowedStates}
              selected={answers.state}
              onSelect={(state) => {
                setAnswers((prev) => ({ ...prev, state }));
                setStep("coverage");
              }}
            />
            <p className="text-xs text-muted-foreground">Don&apos;t see your state? Your agent may not be licensed in your area yet.</p>
          </QuestionFrame>
        )}

        {step === "coverage" && (
          <QuestionFrame step="coverage" title="How much coverage do you want?" subtitle="Most families pick 10-15x their household income." onBack={goBack("state")}>
            {coverageChoices.map((amount) => (
              <ChoiceCard
                key={amount}
                title={money(amount)}
                description={amount >= 1_000_000 ? "High coverage" : amount >= 500_000 ? "Family coverage" : "Starter coverage"}
                selected={answers.coverageAmount === amount}
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, coverageAmount: amount }));
                  setStep("smoker");
                }}
                testId={`button-coverage-${amount}`}
              />
            ))}
          </QuestionFrame>
        )}

        {step === "smoker" && (
          <QuestionFrame step="smoker" title="Have you used tobacco or nicotine in the last 12 months?" subtitle="Includes cigarettes, vapes, cigars, chew, and nicotine gum." onBack={goBack("coverage")}>
            <ChoiceCard
              title="No"
              description="Non-tobacco pricing"
              selected={answers.smoker === false}
              onClick={() => {
                setAnswers((prev) => ({ ...prev, smoker: false }));
                setStep("health");
              }}
              testId="button-smoker-no"
            />
            <ChoiceCard
              title="Yes"
              description="Tobacco pricing"
              selected={answers.smoker === true}
              onClick={() => {
                setAnswers((prev) => ({ ...prev, smoker: true }));
                setStep("health");
              }}
              testId="button-smoker-yes"
            />
          </QuestionFrame>
        )}

        {step === "health" && (
          <QuestionFrame step="health" title="How would you describe your overall health?" subtitle="Be honest. This helps us avoid surprise pricing later." onBack={goBack("smoker")}>
            {healthOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                title={option.label}
                description={option.description}
                selected={answers.health === option.value}
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, health: option.value }));
                  setStep("contact");
                }}
                testId={`button-health-${option.value}`}
              />
            ))}
          </QuestionFrame>
        )}

        {step === "contact" && (
          <QuestionFrame step="contact" title="Where should we send your quotes?" subtitle="We only share these details with your assigned licensed agent." onBack={goBack("health")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="First name" name="given-name" id="contact-first-name" autoComplete="given-name" value={contact.firstName ?? ""} onChange={(value) => setContact((prev) => ({ ...prev, firstName: value }))} placeholder="Jordan" testId="input-contact-first-name" />
              <TextField label="Last name" name="family-name" id="contact-last-name" autoComplete="family-name" value={contact.lastName ?? ""} onChange={(value) => setContact((prev) => ({ ...prev, lastName: value }))} placeholder="Riley" testId="input-contact-last-name" />
            </div>
            <TextField label="Email" type="email" name="email" id="contact-email" autoComplete="email" inputMode="email" value={contact.email ?? ""} onChange={(value) => setContact((prev) => ({ ...prev, email: value }))} placeholder="you@email.com" testId="input-contact-email" />
            <TextField label="Mobile phone" type="tel" name="phone" id="contact-phone" autoComplete="tel" inputMode="tel" value={contact.phone ?? ""} onChange={(value) => setContact((prev) => ({ ...prev, phone: value }))} placeholder="(212) 555-0100" testId="input-contact-phone" />
            <TextField label="ZIP code (optional)" name="postal-code" id="contact-zip" autoComplete="postal-code" inputMode="numeric" value={contact.zip ?? ""} onChange={(value) => setContact((prev) => ({ ...prev, zip: value }))} placeholder="10013" testId="input-contact-zip" />
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                checked={Boolean(contact.consent)}
                onChange={(event) => setContact((prev) => ({ ...prev, consent: event.target.checked }))}
                data-testid="checkbox-contact-consent"
              />
              <span className="leading-5 text-muted-foreground">
                I agree to be contacted by PolicyQuoters and/or {landingPage.agent.displayName} (the assigned licensed agent) by phone, text, or email about insurance options. See our{" "}
                <Link href="/privacy-policy" className="font-medium text-primary underline-offset-2 hover:underline">privacy policy</Link>.
              </span>
            </label>
            <Button
              size="lg"
              className="w-full rounded-full"
              disabled={
                !contact.firstName?.trim() ||
                !contact.lastName?.trim() ||
                !contact.email?.trim() ||
                !contact.phone?.trim() ||
                !contact.consent ||
                quoteMutation.isPending
              }
              data-testid="button-submit-contact"
              onClick={() => quoteMutation.mutate()}
            >
              {quoteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              See my quotes
            </Button>
          </QuestionFrame>
        )}

        {step === "results" && response ? (
          <QuestionFrame step="results" title="Pick the quote that fits you best" subtitle="Your assigned licensed agent will reach out to finalize coverage." onBack={goBack("contact")}>
            <ResultsCards response={response} onSelect={(option) => selectMutation.mutate(option)} selecting={selectMutation.isPending} selectedId={selectedQuoteId} />
          </QuestionFrame>
        ) : null}

        {step === "thanks" && (
          <QuestionFrame step="thanks" title="You're all set" subtitle={`${landingPage.agent.displayName} will reach out shortly to walk through your selected quote.`}>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-semibold">What happens next</p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>1. Your licensed agent reviews your quote and contacts you.</li>
                <li>2. They confirm your details and answer any questions.</li>
                <li>3. They help you complete the carrier application.</li>
              </ul>
            </div>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href="/">Return to PolicyQuoters</Link>
            </Button>
          </QuestionFrame>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help? See our{" "}
          <Link href="/privacy-policy" className="text-primary underline-offset-2 hover:underline">privacy policy</Link>.
        </p>
      </section>
    </main>
  );
}
