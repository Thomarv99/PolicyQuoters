// Lightweight Google Analytics 4 (gtag) wrapper.
//
// Loads the GA4 script lazily once a measurement ID is known, then exposes
// helpers to send page views and custom events. Designed to be resilient:
// - never throws if gtag is blocked, missing, or the measurement ID is absent
// - never logs to the console in normal operation
// - safe to call from SSR / pre-mount contexts (window guard)
//
// PII MUST NOT be passed to any tracking call. Only non-identifying funnel
// signals (slug, state, coverage tier, smoker flag, etc.) should be sent.

type GtagArgs = unknown[];
type Gtag = (...args: GtagArgs) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: GtagArgs[];
  }
}

// Default measurement ID for PolicyQuoters. Mirrors the Meta Pixel pattern of
// shipping a sensible default while still honoring an env override.
const DEFAULT_MEASUREMENT_ID = "G-R5NXRQVS7Z";

const SCRIPT_BASE = "https://www.googletagmanager.com/gtag/js?id=";

let configuredId: string | undefined;
let scriptInjected = false;

function envMeasurementId(): string | undefined {
  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveMeasurementId(override?: string | null): string | undefined {
  const candidate = (override ?? "").trim();
  if (candidate) return candidate;
  return envMeasurementId() ?? DEFAULT_MEASUREMENT_ID;
}

export function isValidMeasurementId(value: string | undefined | null): value is string {
  if (!value) return false;
  return /^G-[A-Z0-9]{4,15}$/.test(value.trim());
}

function ensureGtagShim(): Gtag | undefined {
  if (typeof window === "undefined") return undefined;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    const gtag: Gtag = function (...args: GtagArgs) {
      window.dataLayer!.push(args);
    };
    window.gtag = gtag;
  }
  return window.gtag;
}

function injectScript(measurementId: string) {
  if (scriptInjected) return;
  if (typeof document === "undefined") return;
  try {
    const src = `${SCRIPT_BASE}${encodeURIComponent(measurementId)}`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_BASE}"]`);
    if (existing) {
      scriptInjected = true;
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    // Swallow errors silently — adblockers commonly block this URL.
    script.onerror = () => {};
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) {
      first.parentNode.insertBefore(script, first);
    } else {
      document.head.appendChild(script);
    }
    scriptInjected = true;
  } catch {
    // ignore
  }
}

/**
 * Initialize GA4 for the given measurement ID (or env / default).
 * Safe to call multiple times. We disable gtag's automatic page_view so the
 * SPA router can send accurate page_view events on every route change.
 */
export function initGa(override?: string | null): string | undefined {
  if (typeof window === "undefined") return undefined;
  const measurementId = resolveMeasurementId(override);
  if (!isValidMeasurementId(measurementId)) return undefined;
  const gtag = ensureGtagShim();
  if (!gtag) return undefined;
  try {
    if (configuredId !== measurementId) {
      gtag("js", new Date());
      // send_page_view: false — the SPA router owns page_view dispatch.
      gtag("config", measurementId, { send_page_view: false });
      configuredId = measurementId;
    }
    injectScript(measurementId);
  } catch {
    // ignore
  }
  return measurementId;
}

/**
 * Send a SPA page_view. Pass the current path (and optional title); falls back
 * to window.location. Page paths/titles are not PII for this product.
 */
export function trackPageView(path?: string, title?: string) {
  if (typeof window === "undefined") return;
  const measurementId = initGa();
  if (!measurementId) return;
  const gtag = window.gtag;
  if (!gtag) return;
  try {
    const pagePath = path ?? `${window.location.pathname}${window.location.search}`;
    gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: title ?? document.title,
    });
  } catch {
    // ignore
  }
}

/**
 * Send a custom GA4 event. Params MUST be non-PII funnel signals only.
 */
export function trackGaEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const measurementId = initGa();
  if (!measurementId) return;
  const gtag = window.gtag;
  if (!gtag) return;
  try {
    gtag("event", event, params ?? {});
  } catch {
    // ignore
  }
}

/**
 * Bucket a coverage amount to a non-PII tier label (mirrors meta-pixel).
 */
export function coverageTier(amount: number | undefined): string | undefined {
  if (!amount || !Number.isFinite(amount)) return undefined;
  if (amount >= 1_000_000) return "1m_plus";
  if (amount >= 500_000) return "500k_999k";
  if (amount >= 250_000) return "250k_499k";
  if (amount >= 100_000) return "100k_249k";
  return "lt_100k";
}
