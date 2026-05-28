// Lightweight Meta Pixel (fbq) wrapper.
//
// Loads the Meta Pixel script lazily once a Pixel ID is known, then exposes
// helpers to track standard and custom events. Designed to be resilient:
// - never throws if fbq is blocked, missing, or the Pixel ID is absent
// - never logs to the console in normal operation
// - safe to call from SSR / pre-mount contexts (window guard)
//
// PII MUST NOT be passed to any tracking call. Only non-identifying funnel
// signals (slug, state, coverage tier, etc.) should be sent.

type FbqArgs = unknown[];
type Fbq = {
  (...args: FbqArgs): void;
  callMethod?: (...args: FbqArgs) => void;
  queue?: FbqArgs[];
  loaded?: boolean;
  version?: string;
  push?: (...args: FbqArgs) => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

const loadedPixelIds = new Set<string>();
let scriptInjected = false;
let pageViewSentForPixel: string | undefined;

function envPixelId(): string | undefined {
  const raw = import.meta.env.VITE_META_PIXEL_ID;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolvePixelId(override?: string | null): string | undefined {
  const candidate = (override ?? "").trim();
  if (candidate) return candidate;
  return envPixelId();
}

export function isValidPixelId(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^\d{6,20}$/.test(value.trim());
}

function ensureFbqShim(): Fbq | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.fbq) return window.fbq;

  const fbq: Fbq = function (...args: FbqArgs) {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, args);
    } else {
      (fbq.queue ||= []).push(args);
    }
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];

  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  return fbq;
}

function injectScript() {
  if (scriptInjected) return;
  if (typeof document === "undefined") return;
  try {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      scriptInjected = true;
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = SCRIPT_SRC;
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
 * Initialize the Meta Pixel for the given Pixel ID (or env default).
 * Safe to call multiple times. Emits a base PageView on first init for the ID.
 */
export function initMetaPixel(override?: string | null): string | undefined {
  if (typeof window === "undefined") return undefined;
  const pixelId = resolvePixelId(override);
  if (!isValidPixelId(pixelId)) return undefined;
  const fbq = ensureFbqShim();
  if (!fbq) return undefined;
  try {
    if (!loadedPixelIds.has(pixelId!)) {
      fbq("init", pixelId);
      loadedPixelIds.add(pixelId!);
    }
    injectScript();
    if (pageViewSentForPixel !== pixelId) {
      fbq("track", "PageView");
      pageViewSentForPixel = pixelId;
    }
  } catch {
    // ignore
  }
  return pixelId;
}

type TrackOptions = {
  /** Optional Pixel ID override (falls back to env). */
  pixelId?: string | null;
  /** Optional event ID for Conversions API dedupe. */
  eventId?: string;
};

function callTrack(method: "track" | "trackCustom", event: string, params?: Record<string, unknown>, options?: TrackOptions) {
  if (typeof window === "undefined") return;
  const pixelId = initMetaPixel(options?.pixelId);
  if (!pixelId) return;
  const fbq = window.fbq;
  if (!fbq) return;
  try {
    const eventId = options?.eventId;
    if (eventId) {
      fbq(method, event, params ?? {}, { eventID: eventId });
    } else {
      fbq(method, event, params ?? {});
    }
  } catch {
    // ignore
  }
}

export function trackStandardEvent(
  event: "PageView" | "ViewContent" | "Lead" | "SubmitApplication" | "CompleteRegistration",
  params?: Record<string, unknown>,
  options?: TrackOptions,
) {
  callTrack("track", event, params, options);
}

export function trackCustomEvent(event: string, params?: Record<string, unknown>, options?: TrackOptions) {
  callTrack("trackCustom", event, params, options);
}

/**
 * Generate a stable-ish event ID for use with Meta Conversions API dedupe.
 * Format: <prefix>-<timestamp>-<random>. Not used for anything PII.
 */
export function newEventId(prefix: string = "evt"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

/**
 * Bucket a coverage amount to a non-PII tier label.
 */
export function coverageTier(amount: number | undefined): string | undefined {
  if (!amount || !Number.isFinite(amount)) return undefined;
  if (amount >= 1_000_000) return "1m_plus";
  if (amount >= 500_000) return "500k_999k";
  if (amount >= 250_000) return "250k_499k";
  if (amount >= 100_000) return "100k_249k";
  return "lt_100k";
}
