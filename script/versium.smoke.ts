// Smoke test for the Versium client. Runs without a real API key by mocking the
// global fetch. Verifies: missing key => skipped, no input => skipped, a 200
// with results => success, a 200 with no results => no_match, and a non-2xx
// response => failure (without crashing). Run: npm run test:versium
import assert from "node:assert/strict";
import { enrichContact, isVersiumConfigured } from "../server/versium";

type FetchFn = typeof fetch;
const realFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown): FetchFn {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as FetchFn;
}

async function run() {
  // 1. Missing key => skipped/not_configured (no network call).
  delete process.env.VERSIUM_API_KEY;
  assert.equal(isVersiumConfigured(), false);
  const skipped = await enrichContact({ email: "test@example.com" });
  assert.equal(skipped.status, "skipped");
  assert.equal(skipped.detail, "not_configured");

  // 2. Key set but no usable input => skipped/no_input.
  process.env.VERSIUM_API_KEY = "fake-key";
  assert.equal(isVersiumConfigured(), true);
  const noInput = await enrichContact({});
  assert.equal(noInput.status, "skipped");
  assert.equal(noInput.detail, "no_input");

  // 3. 200 with a matched record => success.
  globalThis.fetch = mockFetch(200, { versium: { results: [{ phone: "5551234567" }] } });
  const success = await enrichContact({ email: "test@example.com", first: "Jane", last: "Doe" });
  assert.equal(success.status, "success");
  assert.ok(success.raw);

  // 4. 200 with empty results => no_match.
  globalThis.fetch = mockFetch(200, { versium: { results: [] } });
  const noMatch = await enrichContact({ email: "nobody@example.com" });
  assert.equal(noMatch.status, "no_match");

  // 5. Non-2xx (e.g. 401/429/5xx) => failure, never throws.
  for (const status of [401, 429, 500]) {
    globalThis.fetch = mockFetch(status, { error: "nope" });
    const failure = await enrichContact({ email: "test@example.com" });
    assert.equal(failure.status, "failure");
    assert.ok(failure.error && failure.error.includes(String(status)));
    // The API key must never leak into the error string.
    assert.ok(!failure.error.includes("fake-key"));
  }

  globalThis.fetch = realFetch;
  console.log("versium smoke test: all assertions passed");
}

run().catch((error) => {
  globalThis.fetch = realFetch;
  console.error("versium smoke test failed:", error);
  process.exit(1);
});
