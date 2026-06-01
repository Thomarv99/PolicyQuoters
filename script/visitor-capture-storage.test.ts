// Integration test for visitor-capture storage and its admin diagnostics.
// Runs against the in-memory store (no DATABASE_URL) and verifies:
//   1. Recorded events round-trip through the same store the admin list reads.
//   2. getVisitorCaptureStorageStatus reports the in-memory backend and flags
//      degraded persistence in production (the bug that made the admin page
//      silently show nothing after a DB-less redeploy).
// Exits non-zero on the first failure.
//
// Run with: npm run test:capture
import {
  getVisitorCaptureStorageStatus,
  listVisitorCaptureEvents,
  recordVisitorCaptureEvent,
} from "../server/visitor-capture";

let failures = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok  - ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL - ${label}`);
  }
}

async function run() {
  console.log("visitor-capture storage diagnostics");

  // Guard: this test only exercises the in-memory path, which requires no
  // DATABASE_URL. Bail loudly rather than touching a real database.
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    console.error("  SKIP - DATABASE_URL is set; this test targets the in-memory store only.");
    process.exit(0);
  }

  // 1. Recorded events are readable from the same store the admin list uses.
  const event = await recordVisitorCaptureEvent({
    source: "test",
    email: "lead@example.com",
    firstName: "Lead",
    rawPayload: { hello: "world" },
  });
  assert("record returns an id", typeof event.id === "string" && event.id.length > 0);

  const listed = await listVisitorCaptureEvents(100);
  assert("admin list reads back the recorded event", listed.some((e) => e.id === event.id));

  // 2. Storage status reports the in-memory backend (no DATABASE_URL here).
  const status = getVisitorCaptureStorageStatus();
  assert("backend is memory without DATABASE_URL", status.backend === "memory");
  assert("databaseUrlConfigured is false", status.databaseUrlConfigured === false);
  assert("memoryEventCount reflects stored events", status.memoryEventCount >= 1);

  // 3. In production, in-memory storage must be flagged as degraded so the
  // admin UI can warn instead of showing an empty list as if all is well.
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const prodStatus = getVisitorCaptureStorageStatus();
  assert("persistenceDegraded is true in production on memory backend", prodStatus.persistenceDegraded === true);
  process.env.NODE_ENV = prevEnv;

  // 4. Outside production, a missing DB is expected and not flagged as degraded.
  process.env.NODE_ENV = "development";
  const devStatus = getVisitorCaptureStorageStatus();
  assert("persistenceDegraded is false in development", devStatus.persistenceDegraded === false);
  process.env.NODE_ENV = prevEnv;

  // 5. Diagnostics never leak the connection string or any secret material.
  const serialized = JSON.stringify(getVisitorCaptureStorageStatus());
  assert("status payload contains no connection string", !serialized.includes("postgres"));

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll visitor-capture storage assertions passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
