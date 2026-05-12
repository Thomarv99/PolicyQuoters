import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import DesktopQuoteFlow from "./desktop-quote-flow";
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
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    bio: "Elliot focuses on straightforward family protection, mortgage protection, and final expense coverage for shoppers who want clear next steps.",
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
        <p className="text-xs text-muted-foreground">Compare coverage with confidence</p>
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
          <p className="font-semibold">Shop insurance</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link href="/quotes">Get life insurance quotes</Link>
            <Link href="/directory">Broker directory</Link>
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
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} PolicyQuoters. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy-policy" data-testid="link-footer-privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function quoteHref(intent?: QuoteIntent, brokerName?: string) {
  const params = new URLSearchParams();
  if (intent) params.set("intent", intent);
  if (brokerName) params.set("broker", brokerName);
  const query = params.toString();
  return query ? `/quotes?${query}` : "/quotes";
}

function WebsiteShell({
  children,
  openQuote,
}: {
  children: React.ReactNode;
  openQuote: (intent?: QuoteIntent, brokerName?: string) => void;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <WebsiteHeader onQuote={openQuote} />
      {children}
      <WebsiteFooter />
    </div>
  );
}

function useQuoteNavigation() {
  const [, navigate] = useLocation();
  const openQuote = (intent?: QuoteIntent, brokerName?: string) => {
    navigate(quoteHref(intent, brokerName));
  };
  return { openQuote };
}

function HeroPanel({ onQuote }: { onQuote: (intent?: QuoteIntent) => void }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
      <div className="flex flex-col justify-center">
        <Badge className="max-w-full whitespace-normal rounded-full leading-5" variant="secondary">
          Life insurance quotes made easier
        </Badge>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-0.06em] sm:text-5xl">
          Compare life insurance quotes and connect with licensed brokers.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          Compare coverage options, learn what each policy type is designed for, and get help from licensed insurance brokers when you are ready.
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
            ["Compare options", "Review multiple types of coverage in one place."],
            ["Find licensed help", "Browse brokers by state, specialty, and carrier."],
            ["Continue anytime", "Start on the website and keep going from your phone."],
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
                <p className="text-sm font-semibold">How shopping works</p>
                <p className="text-xs text-muted-foreground">Compare, choose, and get help</p>
              </div>
              <Badge className="rounded-full">Simple steps</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["1", "Tell us what kind of coverage you want"],
                ["2", "Compare available policy options"],
                ["3", "Choose the quote that fits your needs"],
                ["4", "Complete the application steps"],
                ["5", "Get connected with licensed support"],
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
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Shop the coverage that fits your goal</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Learn the difference between common life insurance options and start a quote when you know what you want to compare.
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
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Find licensed brokers by state and specialty</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Browse experienced insurance professionals, see the products they focus on, and start a quote from any broker profile.
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
  const modal = useQuoteNavigation();
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
    <WebsiteShell openQuote={modal.openQuote}>
      <HeroPanel onQuote={modal.openQuote} />
      <LinesSection onQuote={modal.openQuote} />
      <DirectoryPreview onQuote={modal.openQuote} />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">Ready to compare coverage?</h2>
              <p className="mt-2 text-sm leading-6 opacity-85">Start with a few basic details, review carrier options side by side, and complete the application when you&apos;re ready.</p>
            </div>
            <Button asChild variant="secondary" className="rounded-full" data-testid="button-home-start-quote-cta">
              <Link href="/quotes">Start your quote</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </WebsiteShell>
  );
}

export function QuotesPage() {
  const modal = useQuoteNavigation();
  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: insuranceLines.slice(0, 4).map((line) => ({
        "@type": "Question",
        name: `How do ${line.keyword} work on PolicyQuoters?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `PolicyQuoters lets consumers compare ${line.keyword} side by side from carriers, lock in a selected quote, and connect with licensed insurance brokers after reviewing options.`,
        },
      })),
    }),
    [],
  );
  useSeo({
    title: "Life Insurance Quotes Online | PolicyQuoters",
    description: "Compare life insurance, IUL, mortgage protection, whole life, and final expense quote options with PolicyQuoters in a desktop-first experience.",
    path: "/quotes",
    jsonLd,
  });

  return (
    <WebsiteShell openQuote={modal.openQuote}>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <DesktopQuoteFlow />
      </main>
    </WebsiteShell>
  );
}

export function DirectoryPage() {
  const modal = useQuoteNavigation();
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
    <WebsiteShell openQuote={modal.openQuote}>
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
  const modal = useQuoteNavigation();
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
    <WebsiteShell openQuote={modal.openQuote}>
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
                Compare quotes first, then choose whether you want licensed help reviewing next steps.
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

export function PrivacyPolicyPage() {
  const modal = useQuoteNavigation();
  useSeo({
    title: "Privacy Policy | PolicyQuoters",
    description:
      "Read the PolicyQuoters privacy policy describing how we collect, use, share, and protect personal information when you compare life insurance quotes and connect with licensed brokers.",
    path: "/privacy-policy",
  });

  return (
    <WebsiteShell openQuote={modal.openQuote}>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-border bg-card/86 p-6 sm:p-8">
          <Badge variant="outline" className="rounded-full">
            Privacy
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.06em]">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Effective date: May 12, 2026</p>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            This Privacy Policy explains how PolicyQuoters (&ldquo;PolicyQuoters,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, shares, and protects information about consumers who use policyquoters.com (the &ldquo;Site&rdquo;) to compare life insurance quotes, complete applications, and connect with licensed insurance brokers and carriers. By using the Site, you agree to the practices described below.
          </p>

          <div className="prose prose-sm mt-8 max-w-none text-foreground prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-h2:text-xl prose-h2:mt-8 prose-h3:text-base prose-h3:mt-6 prose-p:leading-7 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly, information generated when you use the Site, and limited information from third parties such as brokers, carriers, marketing partners, and analytics providers.</p>

            <h3>1.1 Quote, application, and contact information</h3>
            <p>When you request a quote or submit an application, you may provide: full name, date of birth, gender, address and ZIP code, email address, phone number, employment status, household information, beneficiary details, requested coverage amount and term, policy preferences, and other underwriting-related answers.</p>

            <h3>1.2 Sensitive insurance and health-related information</h3>
            <p>Life insurance applications often involve sensitive information. Depending on the products you request, you may be asked to provide: tobacco and nicotine use, height and weight, medical history, prescription information, family medical history, lifestyle activities, driving history, military status, and other underwriting information. We treat this information as sensitive and use it only for the purposes described in this policy or as permitted by law.</p>

            <h3>1.3 Account information</h3>
            <p>If you create an account, we collect your username, password (stored in hashed form), saved quote progress, documents you upload, and account activity such as logins and preferences.</p>

            <h3>1.4 Automatically collected information</h3>
            <p>When you visit the Site we automatically collect: IP address, device and browser type, operating system, referring and exit pages, pages viewed, the date and time of access, and similar diagnostic data. We use cookies, pixels, local storage, and similar technologies to operate the Site, remember preferences, measure performance, and support marketing.</p>

            <h3>1.5 Information from third parties</h3>
            <p>We may receive information from licensed insurance brokers, carriers, lead and marketing partners, identity-verification providers, and publicly available sources. For example, a broker you choose may share status updates about an application you submitted through the Site.</p>

            <h2>2. How We Use Information</h2>
            <ul>
              <li>Provide, operate, and improve the Site and quote experience.</li>
              <li>Generate quotes, match you with licensed insurance brokers, and facilitate applications with carriers.</li>
              <li>Verify identity, prevent fraud, and protect the security of the Site and our users.</li>
              <li>Communicate with you about your quotes, applications, account, and customer support requests.</li>
              <li>Send marketing communications about insurance products and related services, subject to your choices.</li>
              <li>Measure and analyze how the Site is used, including through analytics services.</li>
              <li>Comply with legal, regulatory, and contractual obligations, and to enforce our Terms.</li>
            </ul>

            <h2>3. How We Share Information</h2>
            <p>We share personal information in the following circumstances:</p>
            <ul>
              <li><strong>Licensed insurance brokers and agents.</strong> When you request quotes or select a broker, we share the information needed to prepare quotes, follow up, and complete an application.</li>
              <li><strong>Insurance carriers.</strong> When you submit an application, we share information with the relevant carrier(s) so they can underwrite and issue the policy.</li>
              <li><strong>Service providers.</strong> We share information with vendors that host our infrastructure, send communications, provide analytics, verify identity, support customer service, or process payments. These providers are required to handle information consistently with this policy.</li>
              <li><strong>Marketing partners.</strong> With your consent or as permitted by law, we may share contact information with vetted marketing partners that offer related insurance or financial products. You can opt out as described below.</li>
              <li><strong>Legal, safety, and compliance.</strong> We may disclose information to comply with law or legal process, respond to lawful requests, protect rights and safety, and address fraud or security issues.</li>
              <li><strong>Business transfers.</strong> If PolicyQuoters is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that transaction.</li>
            </ul>
            <p>We do not sell sensitive insurance or health-related information for cross-context behavioral advertising.</p>

            <h2>4. Cookies, Analytics, and Online Advertising</h2>
            <p>We use cookies and similar technologies to keep you signed in, remember your quote progress, understand Site usage, and measure marketing performance. We may use third-party analytics services and advertising partners that set their own cookies and identifiers. You can control cookies through your browser settings. Disabling cookies may affect Site functionality.</p>
            <p>Some browsers offer a &ldquo;Do Not Track&rdquo; signal. Because there is no consistent industry standard for responding to such signals, we currently do not respond to them, but we honor opt-out preference signals where required by applicable law.</p>

            <h2>5. Security</h2>
            <p>We use administrative, technical, and physical safeguards designed to protect personal information, including encryption in transit, restricted access, and monitoring. No system is perfectly secure, and we cannot guarantee absolute security. You are responsible for keeping your account credentials confidential.</p>

            <h2>6. Data Retention</h2>
            <p>We retain personal information for as long as needed to provide the services you request, comply with legal and regulatory requirements (including insurance recordkeeping requirements), resolve disputes, and enforce our agreements. Retention periods vary based on the type of information and the purpose for which it was collected. When information is no longer needed, we delete or de-identify it.</p>

            <h2>7. Your Choices</h2>
            <ul>
              <li><strong>Marketing email.</strong> You can opt out of marketing emails by using the unsubscribe link in any message or by contacting us.</li>
              <li><strong>Calls and texts.</strong> You can ask to be removed from marketing call or text lists by replying STOP to a text or by contacting us.</li>
              <li><strong>Account information.</strong> Signed-in users can review and update certain account details at any time.</li>
              <li><strong>Cookies.</strong> You can manage cookies through your browser. Some Site features depend on cookies.</li>
            </ul>

            <h2>8. State Privacy Rights</h2>
            <p>Depending on where you live, you may have additional rights under state privacy laws (for example, California, Colorado, Connecticut, Virginia, Utah, Texas, Oregon, Montana, and similar laws). Those rights may include:</p>
            <ul>
              <li>Knowing what personal information we collect and how we use it.</li>
              <li>Accessing or receiving a copy of your personal information.</li>
              <li>Correcting inaccurate personal information.</li>
              <li>Deleting personal information, subject to legal exceptions.</li>
              <li>Opting out of certain sharing for targeted advertising, &ldquo;sales,&rdquo; or profiling that produces legal or similarly significant effects.</li>
              <li>Limiting the use and disclosure of sensitive personal information.</li>
              <li>Appealing a denial of a rights request.</li>
            </ul>
            <p>California residents may also request information about categories of personal information we collected, sold, or shared in the prior 12 months and the categories of recipients. To exercise any of these rights, contact us using the details below. We will verify requests before responding and will not discriminate against you for exercising your rights. You may designate an authorized agent to act on your behalf, subject to verification.</p>

            <h2>9. Children&rsquo;s Privacy</h2>
            <p>The Site is intended for adults. We do not knowingly collect personal information from children under 13 (or under 16 where required by law). If you believe a child has provided us with personal information, please contact us so we can delete it.</p>

            <h2>10. International Users</h2>
            <p>The Site is operated from the United States and is intended for U.S. residents. If you access the Site from outside the United States, your information will be processed in the United States, which may have different data protection laws than your jurisdiction.</p>

            <h2>11. Third-Party Sites</h2>
            <p>The Site may link to third-party websites, including broker and carrier sites. Those websites operate under their own privacy policies. We are not responsible for the privacy practices of third parties.</p>

            <h2>12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. When we do, we will revise the effective date above and, where appropriate, provide additional notice. Your continued use of the Site after the changes take effect means you accept the updated policy.</p>

            <h2>13. How to Contact Us</h2>
            <p>If you have questions about this Privacy Policy or want to exercise a privacy right, contact us at:</p>
            <p>
              <strong>PolicyQuoters</strong>
              <br />
              Email: <a href="mailto:privacy@policyquoters.com">privacy@policyquoters.com</a>
              <br />
              Website: <a href="https://www.policyquoters.com">www.policyquoters.com</a>
            </p>
            <p className="text-xs">This Privacy Policy is provided for general informational purposes and does not constitute legal advice. Specific obligations may vary based on your jurisdiction.</p>
          </div>
        </section>
      </main>
    </WebsiteShell>
  );
}

export function LoginPage({ role }: { role: LoginRole }) {
  const roleCopy: Record<LoginRole, { title: string; description: string; destination: string; cta: string }> = {
    consumer: {
      title: "Consumer login",
      description: "Return to saved quotes, applications, documents, and coverage progress.",
      destination: "/quotes",
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
              This demo login opens the right dashboard. A production account would protect saved quotes, documents, and account activity.
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
