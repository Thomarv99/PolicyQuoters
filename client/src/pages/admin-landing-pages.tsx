import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, Copy, Database, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LandingLead, LandingPage, LandingPageInput } from "@shared/schema";
import { CARRIER_CATALOG, US_STATES, findCarrierEntry, findStateOption } from "@shared/catalogs";

type AgentSummary = {
  id: string;
  name: string;
  agency: string;
  email: string;
  phone: string;
  licenseStates: string[];
  carrierAppointments: string[];
};

const emptyForm: LandingPageInput = {
  name: "",
  slug: "",
  agentId: "",
  agentDisplayName: "",
  agentDisplayTitle: "",
  agentPhone: "",
  agentEmail: "",
  licensedStates: [],
  licensedCarriers: [],
  headline: "",
  subheadline: "",
  active: true,
  metaPixelId: "",
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg aria-label="PolicyQuoters" viewBox="0 0 40 40" className="h-10 w-10 text-primary">
        <path d="M20 4 8 9v9c0 8.2 4.9 14.2 12 18 7.1-3.8 12-9.8 12-18V9L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 21h12M20 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold leading-none">PolicyQuoters</p>
        <p className="text-xs text-muted-foreground">Landing page builder</p>
      </div>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", testId }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string; testId: string }) {
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

function TextArea({ value, onChange, placeholder, testId }: { value: string; onChange: (value: string) => void; placeholder?: string; testId: string }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={3}
      data-testid={testId}
      className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}

function Pill({ active, label, onClick, testId }: { active: boolean; label: string; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function publicUrl(slug: string) {
  if (typeof window === "undefined") return `/lp/${slug}`;
  return `${window.location.origin}/lp/${slug}`;
}

export default function AdminLandingPages() {
  const [form, setForm] = useState<LandingPageInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [copiedSlug, setCopiedSlug] = useState<string | undefined>();
  const [customStateInput, setCustomStateInput] = useState("");
  const [customCarrierInput, setCustomCarrierInput] = useState("");
  const [carrierSearch, setCarrierSearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");

  const { data: agents = [] } = useQuery<AgentSummary[]>({ queryKey: ["/api/admin/agents"] });
  const { data: pages = [], isLoading } = useQuery<LandingPage[]>({ queryKey: ["/api/admin/landing-pages"] });
  const { data: leads = [] } = useQuery<LandingLead[]>({ queryKey: ["/api/admin/leads"] });

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === form.agentId), [agents, form.agentId]);

  const setField = <K extends keyof LandingPageInput>(key: K, value: LandingPageInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(undefined);
    setError(undefined);
  };

  const startEdit = (page: LandingPage) => {
    setEditingId(page.id);
    setForm({
      name: page.name,
      slug: page.slug,
      agentId: page.agentId,
      agentDisplayName: page.agentDisplayName,
      agentDisplayTitle: page.agentDisplayTitle ?? "",
      agentPhone: page.agentPhone ?? "",
      agentEmail: page.agentEmail ?? "",
      licensedStates: page.licensedStates,
      licensedCarriers: page.licensedCarriers,
      headline: page.headline ?? "",
      subheadline: page.subheadline ?? "",
      active: page.active,
      metaPixelId: page.metaPixelId ?? "",
    });
  };

  const pickAgent = (agentId: string) => {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) return;
    setForm((prev) => ({
      ...prev,
      agentId: agent.id,
      agentDisplayName: prev.agentDisplayName || agent.name,
      agentDisplayTitle: prev.agentDisplayTitle || `Licensed agent · ${agent.agency}`,
      agentPhone: prev.agentPhone || agent.phone,
      agentEmail: prev.agentEmail || agent.email,
      licensedStates: prev.licensedStates.length ? prev.licensedStates : agent.licenseStates,
      licensedCarriers: prev.licensedCarriers.length ? prev.licensedCarriers : agent.carrierAppointments,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: LandingPageInput = {
        ...form,
        slug: slugify(form.slug || form.name),
        agentDisplayTitle: form.agentDisplayTitle || undefined,
        agentPhone: form.agentPhone || undefined,
        agentEmail: form.agentEmail || undefined,
        headline: form.headline || undefined,
        subheadline: form.subheadline || undefined,
        metaPixelId: form.metaPixelId?.trim() || undefined,
      };
      const url = editingId ? `/api/admin/landing-pages/${editingId}` : "/api/admin/landing-pages";
      const method = editingId ? "PUT" : "POST";
      const res = await apiRequest(method, url, payload);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      resetForm();
    },
    onError: (err: Error) => {
      setError(err.message || "Could not save landing page.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/landing-pages/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      if (editingId) resetForm();
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (!form.name.trim() || !form.agentId || form.licensedCarriers.length === 0 || form.licensedStates.length === 0) {
      setError("Name, agent, at least one state, and at least one carrier are required.");
      return;
    }
    const pixel = form.metaPixelId?.trim();
    if (pixel && !/^\d{6,20}$/.test(pixel)) {
      setError("Meta Pixel ID must be 6-20 digits (or leave blank to use the global pixel).");
      return;
    }
    saveMutation.mutate();
  };

  const copyUrl = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(undefined), 2000);
    } catch {
      setCopiedSlug(undefined);
    }
  };

  const toggleState = (state: string) => {
    const normalized = state.trim().toUpperCase();
    if (!normalized) return;
    setField(
      "licensedStates",
      form.licensedStates.includes(normalized)
        ? form.licensedStates.filter((value) => value !== normalized)
        : [...form.licensedStates, normalized],
    );
  };

  const toggleCarrier = (carrier: string) => {
    const normalized = carrier.trim();
    if (!normalized) return;
    setField(
      "licensedCarriers",
      form.licensedCarriers.includes(normalized)
        ? form.licensedCarriers.filter((value) => value !== normalized)
        : [...form.licensedCarriers, normalized],
    );
  };

  const addCustomState = () => {
    const raw = customStateInput.trim();
    if (!raw) return;
    const matched = findStateOption(raw);
    const code = (matched?.code ?? raw).toUpperCase().slice(0, 2);
    if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
      setError("State must be a 2-letter code (or full state name).");
      return;
    }
    if (!form.licensedStates.includes(code)) {
      setField("licensedStates", [...form.licensedStates, code]);
    }
    setCustomStateInput("");
    setError(undefined);
  };

  const addCustomCarrier = () => {
    const raw = customCarrierInput.trim();
    if (!raw) return;
    const matched = findCarrierEntry(raw);
    const displayName = matched?.name ?? raw;
    if (displayName.length < 2) {
      setError("Carrier name must be at least 2 characters.");
      return;
    }
    if (!form.licensedCarriers.some((carrier) => carrier.toLowerCase() === displayName.toLowerCase())) {
      setField("licensedCarriers", [...form.licensedCarriers, displayName]);
    }
    setCustomCarrierInput("");
    setError(undefined);
  };

  // Preset state options. Includes the full US catalog (states + DC + territories),
  // any state already saved on the page (so custom codes survive an edit), and any
  // states the selected/known agents are licensed in.
  const presetStates = useMemo(() => {
    const codes = new Set<string>(US_STATES.map((option) => option.code));
    agents.forEach((agent) => agent.licenseStates.forEach((state) => codes.add(state.toUpperCase())));
    selectedAgent?.licenseStates.forEach((state) => codes.add(state.toUpperCase()));
    form.licensedStates.forEach((state) => codes.add(state.toUpperCase()));
    return Array.from(codes).sort();
  }, [agents, selectedAgent, form.licensedStates]);

  const filteredStates = useMemo(() => {
    const query = stateSearch.trim().toLowerCase();
    if (!query) return presetStates;
    return presetStates.filter((code) => {
      if (code.toLowerCase().includes(query)) return true;
      const option = US_STATES.find((state) => state.code === code);
      return option ? option.name.toLowerCase().includes(query) : false;
    });
  }, [presetStates, stateSearch]);

  // Preset carriers: catalog + already-saved carriers + agent appointment lists.
  const presetCarriers = useMemo(() => {
    const map = new Map<string, { name: string; code?: string; rating?: string }>();
    CARRIER_CATALOG.forEach((entry) => map.set(entry.name.toLowerCase(), { name: entry.name, code: entry.code, rating: entry.amBestRating }));
    const addCarrier = (carrier: string) => {
      const key = carrier.toLowerCase();
      if (map.has(key)) return;
      const matched = findCarrierEntry(carrier);
      map.set(key, matched ? { name: matched.name, code: matched.code, rating: matched.amBestRating } : { name: carrier });
    };
    agents.forEach((agent) => agent.carrierAppointments.forEach(addCarrier));
    selectedAgent?.carrierAppointments.forEach(addCarrier);
    form.licensedCarriers.forEach(addCarrier);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [agents, selectedAgent, form.licensedCarriers]);

  const filteredCarriers = useMemo(() => {
    const query = carrierSearch.trim().toLowerCase();
    if (!query) return presetCarriers;
    return presetCarriers.filter(
      (carrier) => carrier.name.toLowerCase().includes(query) || (carrier.code?.toLowerCase().includes(query) ?? false),
    );
  }, [presetCarriers, carrierSearch]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_36rem),hsl(var(--background))] text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">Internal MVP</Badge>
            <Button asChild variant="outline" className="rounded-full"><Link href="/admin">Routing console</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link href="/agent">Agent portal</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link href="/">Consumer app</Link></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <Card className="mb-5 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <CardContent className="flex items-start gap-3 p-4 text-sm leading-6">
            <Database className="mt-0.5 h-4 w-4" />
            <p>
              <strong>Prototype persistence:</strong> Landing pages, submissions, and leads are stored in-process in memory for this MVP.
              For production on Render, swap to Supabase (or another managed database). See <code>README_RENDER.md</code> for env vars.
            </p>
          </CardContent>
        </Card>

        <section className="mb-5 rounded-3xl border border-border bg-card/86 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">Landing pages</Badge>
              <h1 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Landing page builder</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Build a public quote funnel for any agent. Each page filters quotes to the carriers and states that agent is appointed and licensed in.
              </p>
            </div>
            <div className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{pages.length}</span> page{pages.length === 1 ? "" : "s"} configured
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-landing-page">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{editingId ? "Edit landing page" : "New landing page"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Page name">
                    <TextInput value={form.name} onChange={(value) => setField("name", value)} placeholder="Maya - Family Life Coverage" testId="input-lp-name" />
                  </Field>
                  <Field label="Slug" hint="Used in the public URL /lp/<slug>">
                    <TextInput value={form.slug} onChange={(value) => setField("slug", slugify(value))} placeholder="family-life" testId="input-lp-slug" />
                  </Field>
                </div>

                <Field label="Assigned agent">
                  <select
                    value={form.agentId}
                    onChange={(event) => pickAgent(event.target.value)}
                    data-testid="select-lp-agent"
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select an agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name} · {agent.agency}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Agent display name">
                    <TextInput value={form.agentDisplayName} onChange={(value) => setField("agentDisplayName", value)} placeholder="Maya Thompson" testId="input-lp-display-name" />
                  </Field>
                  <Field label="Agent title (optional)">
                    <TextInput value={form.agentDisplayTitle ?? ""} onChange={(value) => setField("agentDisplayTitle", value)} placeholder="Licensed agent · PolicyQuoters Network" testId="input-lp-display-title" />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Agent phone (optional)">
                    <TextInput value={form.agentPhone ?? ""} onChange={(value) => setField("agentPhone", value)} placeholder="(800) 555-0148" testId="input-lp-phone" />
                  </Field>
                  <Field label="Agent email (optional)">
                    <TextInput value={form.agentEmail ?? ""} onChange={(value) => setField("agentEmail", value)} placeholder="agent@example.com" type="email" testId="input-lp-email" />
                  </Field>
                </div>

                <Field label="Headline (optional)">
                  <TextInput value={form.headline ?? ""} onChange={(value) => setField("headline", value)} placeholder="Affordable life insurance for your family" testId="input-lp-headline" />
                </Field>
                <Field label="Subheadline (optional)">
                  <TextArea value={form.subheadline ?? ""} onChange={(value) => setField("subheadline", value)} placeholder="See real quotes from top-rated carriers in under a minute." testId="input-lp-subheadline" />
                </Field>

                <Field
                  label="Meta Pixel ID (optional · advanced)"
                  hint="Override the global VITE_META_PIXEL_ID for this page. Leave blank to use the site-wide pixel (if configured). 6-20 digit numeric ID."
                >
                  <TextInput
                    value={form.metaPixelId ?? ""}
                    onChange={(value) => setField("metaPixelId", value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 1234567890123456"
                    testId="input-lp-meta-pixel-id"
                  />
                </Field>

                <Field
                  label="Licensed states"
                  hint={
                    selectedAgent
                      ? `Pre-filled from ${selectedAgent.name}'s profile. Click to toggle, or add a custom code.`
                      : "Click to toggle the states this landing page should accept, or add a custom code."
                  }
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={stateSearch}
                        onChange={(event) => setStateSearch(event.target.value)}
                        placeholder="Search states by code or name"
                        data-testid="input-state-search"
                        className="h-10 w-full bg-transparent text-sm outline-none"
                      />
                      {stateSearch ? (
                        <button
                          type="button"
                          onClick={() => setStateSearch("")}
                          className="text-muted-foreground hover:text-foreground"
                          data-testid="button-clear-state-search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2" data-testid="list-lp-states">
                      {filteredStates.map((state) => {
                        const option = US_STATES.find((entry) => entry.code === state);
                        return (
                          <Pill
                            key={state}
                            active={form.licensedStates.includes(state)}
                            label={option ? `${state} · ${option.name}` : state}
                            onClick={() => toggleState(state)}
                            testId={`button-state-${state}`}
                          />
                        );
                      })}
                      {filteredStates.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No matches. Add it manually below.</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[180px]">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Add a custom state</span>
                        <input
                          value={customStateInput}
                          onChange={(event) => setCustomStateInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addCustomState();
                            }
                          }}
                          placeholder="e.g. NY or New York"
                          data-testid="input-custom-state"
                          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={addCustomState}
                        disabled={!customStateInput.trim()}
                        data-testid="button-add-custom-state"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add state
                      </Button>
                    </div>
                    {form.licensedStates.length > 0 ? (
                      <div className="rounded-2xl border border-border bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Selected ({form.licensedStates.length})</p>
                        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="list-lp-selected-states">
                          {form.licensedStates.map((state) => (
                            <span
                              key={state}
                              className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                            >
                              {state}
                              <button
                                type="button"
                                onClick={() => toggleState(state)}
                                aria-label={`Remove ${state}`}
                                data-testid={`button-remove-state-${state}`}
                                className="rounded-full p-0.5 hover:bg-primary-foreground/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Field>

                <Field
                  label="Carrier catalog"
                  hint="Add or select the carriers this agent is licensed with. Final Hexure availability is validated when sandbox credentials are connected."
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={carrierSearch}
                        onChange={(event) => setCarrierSearch(event.target.value)}
                        placeholder="Search carriers by name"
                        data-testid="input-carrier-search"
                        className="h-10 w-full bg-transparent text-sm outline-none"
                      />
                      {carrierSearch ? (
                        <button
                          type="button"
                          onClick={() => setCarrierSearch("")}
                          className="text-muted-foreground hover:text-foreground"
                          data-testid="button-clear-carrier-search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-2"
                      data-testid="list-lp-carriers"
                    >
                      <div className="flex flex-wrap gap-2">
                        {filteredCarriers.map((carrier) => (
                          <Pill
                            key={carrier.name}
                            active={form.licensedCarriers.some((value) => value.toLowerCase() === carrier.name.toLowerCase())}
                            label={carrier.name}
                            onClick={() => toggleCarrier(carrier.name)}
                            testId={`button-carrier-${carrier.code ?? carrier.name.replace(/\s+/g, "-")}`}
                          />
                        ))}
                        {filteredCarriers.length === 0 ? (
                          <p className="px-2 py-3 text-xs text-muted-foreground">
                            No carriers match &quot;{carrierSearch}&quot;. Add a custom carrier below.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[200px]">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Add a custom carrier</span>
                        <input
                          value={customCarrierInput}
                          onChange={(event) => setCustomCarrierInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addCustomCarrier();
                            }
                          }}
                          placeholder="e.g. Acme Life"
                          data-testid="input-custom-carrier"
                          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={addCustomCarrier}
                        disabled={!customCarrierInput.trim()}
                        data-testid="button-add-custom-carrier"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add carrier
                      </Button>
                    </div>
                    {form.licensedCarriers.length > 0 ? (
                      <div className="rounded-2xl border border-border bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Selected ({form.licensedCarriers.length})</p>
                        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="list-lp-selected-carriers">
                          {form.licensedCarriers.map((carrier) => (
                            <span
                              key={carrier}
                              className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                            >
                              {carrier}
                              <button
                                type="button"
                                onClick={() => toggleCarrier(carrier)}
                                aria-label={`Remove ${carrier}`}
                                data-testid={`button-remove-carrier-${carrier.replace(/\s+/g, "-")}`}
                                className="rounded-full p-0.5 hover:bg-primary-foreground/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Field>

                <label className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    checked={form.active}
                    onChange={(event) => setField("active", event.target.checked)}
                    data-testid="checkbox-lp-active"
                  />
                  <span>Page is active and accepting consumer traffic</span>
                </label>

                {error ? <p className="text-sm text-destructive" data-testid="text-lp-error">{error}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" className="rounded-full" disabled={saveMutation.isPending} data-testid="button-save-lp">
                    {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {editingId ? "Update landing page" : "Create landing page"}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="outline" className="rounded-full" onClick={resetForm} data-testid="button-cancel-lp">Cancel</Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </form>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Existing landing pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" data-testid="list-landing-pages">
                {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
                {pages.length === 0 && !isLoading ? <p className="text-sm text-muted-foreground">No landing pages yet. Create one on the left.</p> : null}
                {pages.map((page) => (
                  <div key={page.id} className={cn("rounded-2xl border bg-card p-3 text-sm transition", editingId === page.id ? "border-primary" : "border-border")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold" data-testid={`text-lp-name-${page.slug}`}>{page.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Agent: {page.agentDisplayName} · {page.licensedStates.length} state{page.licensedStates.length === 1 ? "" : "s"} · {page.licensedCarriers.length} carrier{page.licensedCarriers.length === 1 ? "" : "s"}</p>
                      </div>
                      <Badge variant={page.active ? "default" : "secondary"} className="rounded-full">{page.active ? "Active" : "Paused"}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-muted px-2 py-1 text-xs">{publicUrl(page.slug)}</code>
                      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => copyUrl(page.slug)} data-testid={`button-copy-${page.slug}`}>
                        {copiedSlug === page.slug ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                        {copiedSlug === page.slug ? "Copied" : "Copy URL"}
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="rounded-full">
                        <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer" data-testid={`link-open-${page.slug}`}>Open</a>
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => startEdit(page)} data-testid={`button-edit-${page.slug}`}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(page.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-${page.slug}`}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent leads from landing pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" data-testid="list-admin-leads">
                {leads.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet. Share a landing page URL to start collecting.</p> : null}
                {leads.slice(0, 6).map((lead) => (
                  <div key={lead.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{lead.contact.firstName} {lead.contact.lastName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{lead.landingPageName} · routed to {lead.agentDisplayName}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full text-xs">{lead.status}</Badge>
                    </div>
                    {lead.selectedQuote ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Selected: {lead.selectedQuote.carrierName} · {lead.selectedQuote.productName} · ${lead.selectedQuote.monthlyPremium.toFixed(2)}/mo
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
