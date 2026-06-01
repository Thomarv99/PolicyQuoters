import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, Download, KeyRound, Loader2, RefreshCw, Search, ShieldAlert, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

type CapturedContact = {
  id: string;
  receivedAt: string;
  source?: string;
  accountKey?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  pageUrl?: string;
  referrer?: string;
  ipAddress?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  rawPayload?: unknown;
  enrichmentStatus?: string;
  enrichmentProvider?: string;
  enrichmentRequestedAt?: string;
  enrichmentCompletedAt?: string;
  enrichmentError?: string;
  enrichmentPayload?: unknown;
};

type StorageStatus = {
  backend: "database" | "memory";
  databaseUrlConfigured: boolean;
  databaseInitialized: boolean;
  databaseInitFailed: boolean;
  persistenceDegraded: boolean;
  memoryEventCount: number;
};

type EventsResponse = { events: CapturedContact[]; storage?: StorageStatus };

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "error"; message: string }
  | { status: "loaded"; events: CapturedContact[]; storage?: StorageStatus };

const LIMIT_OPTIONS = [25, 50, 100, 250] as const;

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-10 w-10 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold leading-none">PolicyQuoters</p>
        <p className="text-xs text-muted-foreground">Captured contacts</p>
      </div>
    </div>
  );
}

function fullName(contact: CapturedContact) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function EnrichmentBadge({ status }: { status?: string }) {
  const variant: "default" | "secondary" | "destructive" | "outline" =
    status === "success"
      ? "default"
      : status === "failure"
        ? "destructive"
        : status === "no_match"
          ? "outline"
          : "secondary";
  return (
    <Badge variant={variant} className="rounded-full text-[11px]">
      {status ?? "pending"}
    </Badge>
  );
}

// Pulls out the first record's appended phone/email/address from a Versium
// Contact Append response across the shapes the API may return, for a quick
// summary in the detail drawer. Returns label/value pairs of non-empty fields.
function summarizeEnrichment(payload: unknown): { label: string; value: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as Record<string, unknown>;
  const versium = (body.versium as Record<string, unknown> | undefined) ?? undefined;
  const resultsRaw = versium?.results ?? body.results;
  const first = Array.isArray(resultsRaw)
    ? resultsRaw[0]
    : resultsRaw && typeof resultsRaw === "object"
      ? (Object.values(resultsRaw as Record<string, unknown>)[0] as unknown)
      : undefined;
  if (!first || typeof first !== "object") return [];
  const record = first as Record<string, unknown>;
  const out: { label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value == null) continue;
    const str = Array.isArray(value) ? value.join(", ") : String(value);
    if (str.trim().length === 0) continue;
    out.push({ label: key, value: str });
    if (out.length >= 12) break;
  }
  return out;
}

// Columns exported to CSV. Intentionally excludes the admin secret and any
// request-auth material so exports never leak credentials.
const CSV_COLUMNS: { key: keyof CapturedContact; label: string }[] = [
  { key: "receivedAt", label: "Received At" },
  { key: "email", label: "Email" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "phone", label: "Phone" },
  { key: "source", label: "Source" },
  { key: "accountKey", label: "Account Key" },
  { key: "pageUrl", label: "Page URL" },
  { key: "referrer", label: "Referrer" },
  { key: "utmSource", label: "UTM Source" },
  { key: "utmMedium", label: "UTM Medium" },
  { key: "utmCampaign", label: "UTM Campaign" },
];

function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(rows: CapturedContact[]) {
  const header = CSV_COLUMNS.map((c) => escapeCsv(c.label)).join(",");
  const body = rows
    .map((row) => CSV_COLUMNS.map((c) => escapeCsv(row[c.key])).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `captured-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="break-words text-sm">{value}</p>
    </div>
  );
}

export default function AdminCapturedContacts() {
  const [secret, setSecret] = useState("");
  const [limit, setLimit] = useState<number>(100);
  const [filter, setFilter] = useState("");
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [detail, setDetail] = useState<CapturedContact | null>(null);
  const [enriching, setEnriching] = useState<string | null>(null);

  async function load(currentLimit = limit) {
    if (!secret.trim()) {
      setState({ status: "error", message: "Enter the admin API secret before fetching." });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/visitor-capture-events?limit=${encodeURIComponent(String(currentLimit))}`,
        {
          headers: { "X-PolicyQuoters-Admin-Secret": secret.trim() },
        },
      );
      if (res.status === 401 || res.status === 403) {
        setState({ status: "unauthorized" });
        return;
      }
      if (res.status === 503) {
        setState({
          status: "error",
          message:
            "The admin endpoint is not configured on the server. Set the POLICYQUOTERS_ADMIN_API_SECRET environment variable, then redeploy.",
        });
        return;
      }
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        setState({
          status: "error",
          message: `Server returned ${res.status}. ${text}`.trim(),
        });
        return;
      }
      // The endpoint returns { events, storage }. Tolerate a bare array too, in
      // case an older server build is deployed, so the page still renders.
      const body = (await res.json()) as EventsResponse | CapturedContact[];
      if (Array.isArray(body)) {
        setState({ status: "loaded", events: body });
      } else {
        setState({ status: "loaded", events: body.events ?? [], storage: body.storage });
      }
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Network error while fetching contacts.",
      });
    }
  }

  async function reEnrich(id: string) {
    if (!secret.trim()) return;
    setEnriching(id);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/visitor-capture-events/${encodeURIComponent(id)}/enrich`,
        {
          method: "POST",
          headers: { "X-PolicyQuoters-Admin-Secret": secret.trim() },
        },
      );
      if (!res.ok) return;
      const updated = (await res.json()) as CapturedContact;
      setState((prev) =>
        prev.status === "loaded"
          ? { status: "loaded", events: prev.events.map((e) => (e.id === id ? updated : e)) }
          : prev,
      );
      setDetail((prev) => (prev && prev.id === id ? updated : prev));
    } catch {
      /* surfaced via unchanged status; admin can retry */
    } finally {
      setEnriching(null);
    }
  }

  const events = state.status === "loaded" ? state.events : [];
  const storage = state.status === "loaded" ? state.storage : undefined;

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((event) => {
      const haystack = [
        event.email,
        fullName(event),
        event.source,
        event.pageUrl,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [events, filter]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">Internal MVP</Badge>
            <Button asChild variant="outline" className="rounded-full"><Link href="/admin">Routing console</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link href="/admin/landing-pages">Landing pages</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link href="/">Consumer app</Link></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <section className="mb-5 rounded-3xl border border-border bg-card/86 p-5">
          <Badge variant="outline" className="rounded-full">Captured contacts</Badge>
          <h1 className="mt-3 text-xl font-semibold tracking-[-0.03em]">GetEmails visitor captures</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Contacts identified by the GetEmails (GE) pixel and delivered to the secured webhook. Enter the admin API
            secret to fetch recent captures. The secret is held in memory for this session only &mdash; it is never
            stored in localStorage, cookies, or the URL. Direct browser access to the API is blocked for privacy; the
            secret header is required on every request.
          </p>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="block flex-1 space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Admin API secret</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete="off"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void load();
                  }}
                  placeholder="X-PolicyQuoters-Admin-Secret"
                  data-testid="input-admin-secret"
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Limit</span>
              <select
                value={limit}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setLimit(next);
                  if (state.status === "loaded" || state.status === "unauthorized") void load(next);
                }}
                data-testid="select-limit"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <Button
              onClick={() => void load()}
              disabled={state.status === "loading"}
              className="h-10 rounded-xl"
              data-testid="button-fetch"
            >
              {state.status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Fetch contacts
            </Button>
          </div>
        </section>

        {state.status === "loaded" ? (
          <section className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by email, name, source, or page URL"
                data-testid="input-filter"
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" data-testid="text-count">
                {filtered.length} of {events.length} shown
              </span>
              <Button
                variant="outline"
                className="h-10 rounded-xl"
                disabled={filtered.length === 0}
                onClick={() => downloadCsv(filtered)}
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </section>
        ) : null}

        {state.status === "loaded" && storage?.persistenceDegraded ? (
          <Card className="mb-4 border-amber-500/50 bg-amber-500/10">
            <CardContent className="flex items-start gap-3 p-6 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-700">Captured contacts are not being saved</p>
                <p className="text-muted-foreground">
                  The server is using volatile in-memory storage, so captures are lost on every
                  redeploy or restart and this list will look empty even when GetEmails is delivering
                  contacts. This happens when{" "}
                  <code className="mx-1">DATABASE_URL</code>
                  is missing or the database could not be reached
                  {storage.databaseUrlConfigured
                    ? " (DATABASE_URL is set but the connection or schema setup failed)"
                    : " (DATABASE_URL is not set)"}
                  . Verify the Supabase/Postgres connection string in your Render environment and
                  redeploy.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "idle" ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Enter the admin API secret above and fetch to view captured contacts.</p>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "loading" ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading captured contacts&hellip;
            </CardContent>
          </Card>
        ) : null}

        {state.status === "unauthorized" ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-6 text-sm">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Unauthorized (401)</p>
                <p className="text-muted-foreground">
                  The admin secret was rejected. Confirm the value you entered matches the
                  <code className="mx-1">POLICYQUOTERS_ADMIN_API_SECRET</code> environment variable configured on the
                  server, then try again.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "error" ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-6 text-sm">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Something went wrong</p>
                <p className="break-words text-muted-foreground" data-testid="text-error">{state.message}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "loaded" && filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {events.length > 0
                  ? "No contacts match your filter."
                  : storage?.persistenceDegraded
                    ? "No captured contacts in memory. See the storage warning above — contacts are not being persisted."
                    : storage?.backend === "database"
                      ? "No captured contacts yet. The database is connected; new GetEmails captures will appear here."
                      : "No captured contacts yet."}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "loaded" && filtered.length > 0 ? (
          <div className="overflow-x-auto rounded-3xl border border-border bg-card/86">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Enrichment</th>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium">UTM</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr key={event.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40" data-testid={`row-contact-${event.id}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(event.receivedAt)}</td>
                    <td className="px-4 py-3 font-medium">{event.email || <span className="text-muted-foreground">&mdash;</span>}</td>
                    <td className="px-4 py-3">{fullName(event) || <span className="text-muted-foreground">&mdash;</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3">{event.phone || <span className="text-muted-foreground">&mdash;</span>}</td>
                    <td className="px-4 py-3">{event.source || <span className="text-muted-foreground">&mdash;</span>}</td>
                    <td className="px-4 py-3"><EnrichmentBadge status={event.enrichmentStatus} /></td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground" title={event.pageUrl}>{event.pageUrl || <span>&mdash;</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[event.utmSource, event.utmMedium, event.utmCampaign].filter(Boolean).join(" / ") || <span>&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(event)} data-testid={`button-detail-${event.id}`}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between gap-2">
              <span>Contact detail</span>
              <Button size="icon" variant="ghost" onClick={() => setDetail(null)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
            <SheetDescription>
              Field names from GetEmails can vary. The raw payload below is the exact webhook body received.
            </SheetDescription>
          </SheetHeader>
          {detail ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Received" value={formatDate(detail.receivedAt)} />
                <Field label="Source" value={detail.source} />
                <Field label="Email" value={detail.email} />
                <Field label="Phone" value={detail.phone} />
                <Field label="First name" value={detail.firstName} />
                <Field label="Last name" value={detail.lastName} />
                <Field label="Account key" value={detail.accountKey} />
                <Field label="UTM source" value={detail.utmSource} />
                <Field label="UTM medium" value={detail.utmMedium} />
                <Field label="UTM campaign" value={detail.utmCampaign} />
              </div>
              <Field label="Page URL" value={detail.pageUrl} />
              <Field label="Referrer" value={detail.referrer} />
              <Field label="IP address" value={detail.ipAddress} />
              <Field label="User agent" value={detail.userAgent} />

              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Contact enrichment
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={enriching === detail.id}
                    onClick={() => void reEnrich(detail.id)}
                    data-testid={`button-enrich-${detail.id}`}
                  >
                    {enriching === detail.id ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    Re-enrich
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <EnrichmentBadge status={detail.enrichmentStatus} />
                  {detail.enrichmentProvider ? (
                    <span className="text-xs text-muted-foreground">via {detail.enrichmentProvider}</span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Requested" value={detail.enrichmentRequestedAt ? formatDate(detail.enrichmentRequestedAt) : undefined} />
                  <Field label="Completed" value={detail.enrichmentCompletedAt ? formatDate(detail.enrichmentCompletedAt) : undefined} />
                </div>
                <Field label="Error" value={detail.enrichmentError} />
                {summarizeEnrichment(detail.enrichmentPayload).length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Appended fields</p>
                    <div className="grid grid-cols-2 gap-2">
                      {summarizeEnrichment(detail.enrichmentPayload).map((field) => (
                        <Field key={field.label} label={field.label} value={field.value} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {detail.enrichmentPayload != null ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Versium raw response</p>
                    <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-background p-3 text-xs" data-testid="text-versium-raw">
                      {JSON.stringify(detail.enrichmentPayload, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Raw payload</p>
                <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-xs" data-testid="text-raw-payload">
                  {JSON.stringify(detail.rawPayload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
