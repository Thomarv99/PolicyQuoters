import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  HeartPulse,
  Lock,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type QuoteIntent = "life-insurance" | "iul" | "mortgage-protection" | "whole-life" | "final-expense";
type LoginRole = "consumer" | "agent" | "admin";

const siteUrl = "https://www.policyquoters.com";

const insuranceLines: Array<{
  id: QuoteIntent;
  title: string;
  keyword: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "life-insurance",
    title: "Life Insurance Quotes",
    keyword: "life insurance quotes",
    description: "Compare term life and permanent coverage options from carriers and licensed insurance brokers.",
    icon: ShieldCheck,
  },
  {
    id: "iul",
    title: "IUL Quotes",
    keyword: "IUL quotes",
    description: "Explore indexed universal life options for protection, cash-value potential, and long-term planning.",
    icon: Sparkles,
  },
  {
    id: "mortgage-protection",
    title: "Mortgage Protection Insurance",
    keyword: "mortgage protection insurance",
    description: "Shop coverage designed to help protect a home loan if the insured dies during the mortgage period.",
    icon: Building2,
  },
  {
    id: "whole-life",
    title: "Whole Life Insurance",
    keyword: "whole life insurance quotes",
    description: "Review lifetime coverage options with guaranteed cash-value features and policy guarantees.",
    icon: HeartPulse,
  },
  {
    id: "final-expense",
    title: "Final Expense Insurance",
    keyword: "final expense insurance quotes",
    description: "Find smaller coverage options designed for funeral, burial, and final cost planning.",
    icon: FileText,
  },
];

const brokers = [
  {
    slug: "maya-thompson-ny",
    name: "Maya Thompson",
    agency: "PolicyQuoters Licensed Partner Network",
    city: "New York",
    state: "NY",
    states: ["NY", "NJ", "PA", "FL"],
    specialties: ["Life Insurance", "IUL", "Mortgage Protection"],
    carriers: ["Guardian", "Pacific Life", "Protective", "Banner Life"],
    rating: 4.9,
    reviews: 184,
    years: 11,
    phone: "(800) 555-0148",
    bio: "Maya helps families compare life insurance, IUL, and mortgage protection options after they have selected a quote online.",
  },
  {
    slug: "elliot-ramirez-fl",
    name: "Elliot Ramirez",
    agency: "Summit Life Partners",
    city: "Miami",
    state: "FL",
    states: ["FL", "GA", "NC", "TX"],
    specialties: ["Term Life", "Mortgage Protection", "Final Expense"],
    carriers: ["Protective", "Banner Life", "Nationwide", "Transamerica"],
    rating: 4.8,
    reviews: 139,
    years: 9,
    phone: "(866) 555-0136",
    bio: "Elliot focuses on straightforward family protection cases, mortgage protection, and fast application handoffs.",
  },
  {
    slug: "priya-shah-ca",
    name: "Priya Shah",
    agency: "Evergreen Advanced Markets",
    city: "Los Angeles",
    state: "CA",
    states: ["CA", "NY", "NJ", "PA", "IL"],
    specialties: ["IUL", "Universal Life", "Annuities"],
    carriers: ["Pacific Life", "Prudential", "MassMutual", "Nationwide"],
    rating: 5.0,
    reviews: 211,
    years: 14,
    phone: "(877) 555-0184",
    bio: "Priya supports advanced-market shoppers comparing permanent life insurance and cash-value-oriented coverage.",
  },
  {
    slug: "daniel-brooks-tx",
    name: "Daniel Brooks",
    agency: "Lakeside Family Insurance",
    city: "Austin",
    state: "TX",
    states: ["TX", "AZ", "OH", "MI"],
    specialties: ["Term Life", "Final Expense", "Mortgage Protection"],
    carriers: ["Banner Life", "Protective", "Mutual of Omaha", "North American"],
    rating: 4.7,
    reviews: 96,
    years: 7,
    phone: "(855) 555-0172",
    bio: "Daniel works with homeowners and families who want clear, affordable life insurance options.",
  },
];

const stateNames: Record<string, string> = {
  NY: "New York",
  NJ: "New Jersey",
  PA: "Pennsylvania",
  FL: "Florida",
  GA: "Georgia",
  NC: "North Carolina",
  TX: "Texas",
  CA: "California",
  IL: "Illinois",
  AZ: "Arizona",
  OH: "Ohio",
  MI: "Michigan",
};

function setMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function useSeo({
  title,
  description,
  path,
  jsonLd,
}: {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", `${siteUrl}${path}`, true);
    setMeta("twitter:card", "summary_large_image");
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${siteUrl}${path}`;

    document.querySelectorAll("[data-policyquoters-jsonld]").forEach((node) => node.remove());
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.policyquotersJsonld = "true";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, jsonLd]);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-home-logo">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-10 w-10 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold leading-none">PolicyQuoters</p>
        <p className="text-xs text-muted-foreground">Insurance shopping platform</p>
      </div>
    </Link>
  );
}

function WebsiteHeader({ onQuote }: { onQuote: (intent?: QuoteIntent) => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Logo />
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Button asChild variant="ghost" className="rounded-full" data-testid="link-nav-quotes">
            <Link href="/quotes">Quotes</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full" data-testid="link-nav-directory">
            <Link href="/directory">Find brokers</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full" data-testid="link-nav-app">
            <Link href="/app">Open PWA</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full" data-testid="link-nav-login">
            <Link href="/login/consumer">Login</Link>
          </Button>
          <Button className="rounded-full" onClick={() => onQuote()} data-testid="button-nav-get-quote">
            Get a quote
          </Button>
        </nav>
      </div>
    </header>
  );
}

function WebsiteFooter() {
  return (
    <footer className="border-t border-border bg-card/60">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            PolicyQuoters helps shoppers compare life insurance options, complete quote intake, and connect completed policy selections to licensed insurance brokers.
          </p>
        </div>
        <div>
          <p className="font-semibold">Platform</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link href="/quotes">Get life insurance quotes</Link>
            <Link href="/directory">Broker directory</Link>
            <Link href="/app">Mobile PWA</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold">Logins</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link href="/login/consumer">Consumer login</Link>
            <Link href="/login/agent">Agent login</Link>
            <Link href="/login/admin">Admin login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function QuoteModal({
  open,
  intent,
  brokerName,
  onClose,
}: {
  open: boolean;
  intent?: QuoteIntent;
  brokerName?: string;
  onClose: () => void;
}) {
  const selectedLine = insuranceLines.find((line) => line.id === intent) ?? insuranceLines[0];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="rounded-full" variant="secondary">
                Quote handoff
              </Badge>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Start your {selectedLine.title.toLowerCase()}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {brokerName ? `${brokerName} can be matched after you compare quotes and select an option.` : "Compare options first, then complete the mobile-friendly quote flow."}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close quote modal" data-testid="button-close-quote-modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>ZIP code</Label>
              <Input placeholder="10013" data-testid="input-modal-zip" />
            </div>
            <div className="space-y-2">
              <Label>Coverage amount</Label>
              <Input placeholder="$500,000" data-testid="input-modal-coverage" />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input placeholder="42" data-testid="input-modal-age" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="you@example.com" data-testid="input-modal-email" />
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
            In production this modal should create a quote-intent record, attribute the traffic source and broker page, and open the same shared quote session in the website, PWA, or native mobile app.
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={onClose} data-testid="button-modal-cancel">
              Keep browsing
            </Button>
            <Button asChild className="rounded-full" data-testid="button-modal-start-pwa">
              <Link href="/app">
                Continue to quote app
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WebsiteShell({
  children,
  quoteOpen,
  quoteIntent,
  brokerName,
  setQuoteOpen,
  openQuote,
}: {
  children: React.ReactNode;
  quoteOpen: boolean;
  quoteIntent?: QuoteIntent;
  brokerName?: string;
  setQuoteOpen: (open: boolean) => void;
  openQuote: (intent?: QuoteIntent, brokerName?: string) => void;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <WebsiteHeader onQuote={openQuote} />
      {children}
      <WebsiteFooter />
      <QuoteModal open={quoteOpen} intent={quoteIntent} brokerName={brokerName} onClose={() => setQuoteOpen(false)} />
    </div>
  );
}

function useQuoteModal() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteIntent, setQuoteIntent] = useState<QuoteIntent | undefined>();
  const [brokerName, setBrokerName] = useState<string | undefined>();

  const openQuote = (intent?: QuoteIntent, broker?: string) => {
    setQuoteIntent(intent);
    setBrokerName(broker);
    setQuoteOpen(true);
  };

  return { quoteOpen, setQuoteOpen, quoteIntent, brokerName, openQuote };
}

function HeroPanel({ onQuote }: { onQuote: (intent?: QuoteIntent) => void }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
      <div className="flex flex-col justify-center">
        <Badge className="max-w-full whitespace-normal rounded-full leading-5" variant="secondary">
          Life insurance quotes, applications, and licensed broker assignment
        </Badge>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.06em] sm:text-5xl">
          Compare life insurance quotes and connect with licensed brokers.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          PolicyQuoters brings quote shopping, policy application intake, e-sign handoff, and agent assignment into one connected insurance shopping platform.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="w-full rounded-full sm:w-auto" onClick={() => onQuote("life-insurance")} data-testid="button-hero-get-quote">
            Get life insurance quotes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full rounded-full sm:w-auto" data-testid="button-hero-directory">
            <Link href="/directory">Find a broker</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["Quote comparison", "Shop multiple products in one flow."],
            ["Broker directory", "Match with licensed brokers by state and carrier."],
            ["Shared PWA", "Continue the quote flow on web, PWA, or mobile."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-border bg-card/80 p-4">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden bg-card/90">
        <CardContent className="p-5">
          <div className="rounded-3xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Live quote journey</p>
                <p className="text-xs text-muted-foreground">Website → PWA → Agent assignment</p>
              </div>
              <Badge className="rounded-full">SEO entry</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["1", "Search user lands on a quote or broker page"],
                ["2", "Quote modal captures intent and source"],
                ["3", "Shop carriers in the connected quote app"],
                ["4", "Application and e-sign handoff"],
                ["5", "Assign completed policy selection to broker"],
              ].map(([step, text]) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">{step}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function LinesSection({ onQuote }: { onQuote: (intent?: QuoteIntent) => void }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="rounded-full">
            Quote categories
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Insurance pages built for search intent</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Each category can become a dedicated SEO page with educational content, FAQs, structured data, and a quote conversion path.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full" data-testid="button-view-quotes-page">
          <Link href="/quotes">View quote pages</Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {insuranceLines.map((line) => (
          <Card key={line.id}>
            <CardContent className="flex h-full flex-col p-4">
              <line.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{line.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{line.description}</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => onQuote(line.id)} data-testid={`button-line-quote-${line.id}`}>
                Get a quote
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function DirectoryPreview({ onQuote }: { onQuote: (intent?: QuoteIntent, brokerName?: string) => void }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-border bg-card/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">
              Broker directory
            </Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">SEO-rich licensed insurance broker listings</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Broker profile pages can target state, city, carrier, and product keywords while converting search users into quote shoppers.
            </p>
          </div>
          <Button asChild className="rounded-full" data-testid="button-directory-preview-link">
            <Link href="/directory">Browse directory</Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {brokers.map((broker) => (
            <BrokerCard key={broker.slug} broker={broker} onQuote={onQuote} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BrokerCard({ broker, onQuote }: { broker: (typeof brokers)[number]; onQuote: (intent?: QuoteIntent, brokerName?: string) => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{broker.name}</p>
            <Badge variant="secondary" className="rounded-full">{broker.state}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{broker.agency}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-semibold">{broker.rating}</span>
          <span className="text-muted-foreground">({broker.reviews} reviews)</span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{broker.city}, {broker.state} · {broker.years} years · {broker.specialties.slice(0, 2).join(", ")}</p>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="rounded-full" data-testid={`button-view-broker-${broker.slug}`}>
            <Link href={`/brokers/${broker.slug}`}>View profile</Link>
          </Button>
          <Button className="rounded-full" onClick={() => onQuote("life-insurance", broker.name)} data-testid={`button-broker-quote-${broker.slug}`}>
            Get a quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PublicHome() {
  const modal = useQuoteModal();
  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PolicyQuoters",
      url: siteUrl,
      description: "Life insurance quote comparison and licensed insurance broker assignment platform.",
      sameAs: [],
    }),
    [],
  );
  useSeo({
    title: "PolicyQuoters | Compare Life Insurance Quotes Online",
    description: "Compare life insurance quotes, shop brokers, complete applications, and connect with licensed insurance agents through PolicyQuoters.",
    path: "/",
    jsonLd,
  });

  return (
    <WebsiteShell {...modal}>
      <HeroPanel onQuote={modal.openQuote} />
      <LinesSection onQuote={modal.openQuote} />
      <DirectoryPreview onQuote={modal.openQuote} />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">Continue into the connected quote PWA.</h2>
              <p className="mt-2 text-sm leading-6 opacity-85">The same quote journey can power the public website, progressive web app, and future native mobile apps.</p>
            </div>
            <Button asChild variant="secondary" className="rounded-full" data-testid="button-open-pwa-cta">
              <Link href="/app">Open quote app</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </WebsiteShell>
  );
}

export function QuotesPage() {
  const modal = useQuoteModal();
  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: insuranceLines.slice(0, 4).map((line) => ({
        "@type": "Question",
        name: `How do ${line.keyword} work on PolicyQuoters?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `PolicyQuoters lets consumers compare ${line.keyword}, continue into a mobile-friendly quote flow, and connect with licensed insurance brokers after selecting an option.`,
        },
      })),
    }),
    [],
  );
  useSeo({
    title: "Life Insurance Quotes Online | PolicyQuoters",
    description: "Compare life insurance, IUL, mortgage protection, whole life, and final expense quote options with PolicyQuoters.",
    path: "/quotes",
    jsonLd,
  });

  return (
    <WebsiteShell {...modal}>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-border bg-card/86 p-6">
          <Badge variant="outline" className="rounded-full">
            Quote pages
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.06em]">Get life insurance quotes online.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Choose a line of insurance, compare options, and continue into the PolicyQuoters PWA to complete the quote and application workflow.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {insuranceLines.map((line) => (
            <Card key={line.id}>
              <CardContent className="p-5">
                <line.icon className="h-6 w-6 text-primary" />
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em]">{line.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{line.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full">{line.keyword}</Badge>
                  <Badge variant="secondary" className="rounded-full">Broker matching</Badge>
                  <Badge variant="secondary" className="rounded-full">Mobile quote flow</Badge>
                </div>
                <Button className="mt-5 rounded-full" onClick={() => modal.openQuote(line.id)} data-testid={`button-quotes-page-${line.id}`}>
                  Start {line.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </WebsiteShell>
  );
}

export function DirectoryPage() {
  const modal = useQuoteModal();
  const [query, setQuery] = useState("");
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = brokers.filter((broker) => {
    const haystack = `${broker.name} ${broker.city} ${broker.state} ${stateNames[broker.state] ?? ""} ${broker.states.map((state) => stateNames[state] ?? state).join(" ")} ${broker.specialties.join(" ")} ${broker.carriers.join(" ")}`.toLowerCase();
    return queryTerms.every((term) => haystack.includes(term));
  });
  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: brokers.map((broker, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/brokers/${broker.slug}`,
        name: `${broker.name} - ${broker.city}, ${broker.state} insurance broker`,
      })),
    }),
    [],
  );
  useSeo({
    title: "Insurance Broker Directory | PolicyQuoters",
    description: "Find licensed insurance brokers for life insurance, IUL, mortgage protection, and final expense quotes through PolicyQuoters.",
    path: "/directory",
    jsonLd,
  });

  return (
    <WebsiteShell {...modal}>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-border bg-card/86 p-6">
          <Badge variant="outline" className="rounded-full">
            Broker directory
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.06em]">Find licensed insurance brokers.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Browse broker listings by state, insurance specialty, and carrier appointment, then start a quote from any profile.
          </p>
          <div className="mt-5 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by state, broker, or product" data-testid="input-directory-search" />
            </div>
          </div>
        </section>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filtered.map((broker) => (
            <BrokerCard key={broker.slug} broker={broker} onQuote={modal.openQuote} />
          ))}
        </div>
      </main>
    </WebsiteShell>
  );
}

export function BrokerProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const modal = useQuoteModal();
  const broker = brokers.find((item) => item.slug === slug) ?? brokers[0];
  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "InsuranceAgency",
      name: broker.name,
      url: `${siteUrl}/brokers/${broker.slug}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: broker.city,
        addressRegion: broker.state,
        addressCountry: "US",
      },
      telephone: broker.phone,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: broker.rating,
        reviewCount: broker.reviews,
      },
      areaServed: broker.states.map((state) => ({ "@type": "State", name: state })),
    }),
    [broker],
  );
  useSeo({
    title: `${broker.name} | ${broker.city} ${broker.state} Life Insurance Broker`,
    description: `${broker.name} is a PolicyQuoters broker listing for ${broker.specialties.join(", ")} in ${broker.city}, ${broker.state}.`,
    path: `/brokers/${broker.slug}`,
    jsonLd,
  });

  return (
    <WebsiteShell {...modal}>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="grid gap-6 lg:grid-cols-[1fr_24rem]">
          <Card className="bg-card/90">
            <CardContent className="p-6">
              <Badge variant="outline" className="rounded-full">
                Licensed broker profile
              </Badge>
              <h1 className="mt-4 text-4xl font-bold tracking-[-0.06em]">{broker.name}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{broker.agency}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="rounded-full"><MapPin className="mr-1 h-3 w-3" /> {broker.city}, {broker.state}</Badge>
                <Badge variant="secondary" className="rounded-full"><Star className="mr-1 h-3 w-3" /> {broker.rating} rating</Badge>
                <Badge variant="secondary" className="rounded-full">{broker.years} years experience</Badge>
              </div>
              <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground">{broker.bio}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <InfoList title="Specialties" items={broker.specialties} />
                <InfoList title="Carrier appointments" items={broker.carriers} />
                <InfoList title="Licensed states" items={broker.states} />
              </div>
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardContent className="space-y-4 p-5">
              <CardTitle className="text-base">Start with {broker.name}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Compare quotes first, then PolicyQuoters can hand the completed policy selection to a licensed broker.
              </p>
              <Button className="w-full rounded-full" onClick={() => modal.openQuote("life-insurance", broker.name)} data-testid="button-profile-get-quote">
                Get a quote
              </Button>
              <Button variant="outline" className="w-full rounded-full" asChild data-testid="button-profile-call">
                <a href={`tel:${broker.phone}`}>
                  <PhoneCall className="mr-2 h-4 w-4" />
                  {broker.phone}
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </WebsiteShell>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="font-semibold">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="rounded-full">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function LoginPage({ role }: { role: LoginRole }) {
  const roleCopy: Record<LoginRole, { title: string; description: string; destination: string; cta: string }> = {
    consumer: {
      title: "Consumer login",
      description: "Return to saved quotes, applications, disclosures, and policy assignment status.",
      destination: "/app",
      cta: "Open quote dashboard",
    },
    agent: {
      title: "Agent and broker login",
      description: "Accept assignments, manage onboarding, view assignment fees, and service completed customer selections.",
      destination: "/agent",
      cta: "Open agent portal",
    },
    admin: {
      title: "PolicyQuoters admin login",
      description: "Manage routing, broker eligibility, assignment fees, quote operations, and platform configuration.",
      destination: "/admin",
      cta: "Open admin console",
    },
  };
  const copy = roleCopy[role];
  useSeo({
    title: `${copy.title} | PolicyQuoters`,
    description: copy.description,
    path: `/login/${role}`,
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <WebsiteHeader onQuote={() => undefined} />
      <main className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl place-items-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <Badge className="w-fit rounded-full" variant="secondary">
              Secure access
            </Badge>
            <CardTitle className="mt-3 text-2xl tracking-[-0.04em]">{copy.title}</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder={`${role}@policyquoters.com`} data-testid={`input-login-email-${role}`} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" data-testid={`input-login-password-${role}`} />
            </div>
            <div className="rounded-2xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
              Production login should use authenticated accounts, role permissions, MFA for agents/admins, and shared quote sessions across website, PWA, and mobile apps.
            </div>
            <Button asChild className="w-full rounded-full" data-testid={`button-login-${role}`}>
              <Link href={copy.destination}>
                <Lock className="mr-2 h-4 w-4" />
                {copy.cta}
              </Link>
            </Button>
            <div className="grid gap-2 text-center text-sm text-muted-foreground sm:grid-cols-3">
              <Link href="/login/consumer">Consumer</Link>
              <Link href="/login/agent">Agent/Broker</Link>
              <Link href="/login/admin">Admin</Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
