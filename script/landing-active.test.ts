// Integration test for landing page active-status persistence.
// Runs against the in-memory store (no DATABASE_URL) and also validates the
// shared Zod schema's defaulting behavior. Exits non-zero on the first failure.
//
// Run with: npm run test:landing
import { landingPageSchema } from "../shared/schema";
import {
  createLandingPage,
  getLandingPageBySlug,
  listLandingPages,
} from "../server/landing-pages";

let failures = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok  - ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL - ${label}`);
  }
}

const baseInput = {
  agentId: "AG-TEST",
  agentDisplayName: "Test Agent",
  licensedStates: ["TX"],
  licensedCarriers: ["Banner"],
};

async function run() {
  console.log("landing page active-status persistence");

  // 1. Created active -> stays active across create, list, and slug lookup.
  const active = await createLandingPage(
    landingPageSchema.parse({ ...baseInput, name: "Active Page", slug: "active-page", active: true }),
  );
  assert("create returns active=true", active.active === true);

  const listed = await listLandingPages();
  const fromList = listed.find((p) => p.slug === "active-page");
  assert("list reload keeps active=true", fromList?.active === true);

  const bySlug = await getLandingPageBySlug("active-page");
  assert("slug reload keeps active=true", bySlug?.active === true);
  // The public /lp/:slug + /api/landing-pages/:slug routes 404 unless page.active.
  assert("active page is publicly servable", Boolean(bySlug && bySlug.active));

  // 2. Explicit inactive stays inactive.
  const inactive = await createLandingPage(
    landingPageSchema.parse({ ...baseInput, name: "Inactive Page", slug: "inactive-page", active: false }),
  );
  assert("create returns active=false when set inactive", inactive.active === false);
  const inactiveReload = await getLandingPageBySlug("inactive-page");
  assert("inactive page stays inactive on reload", inactiveReload?.active === false);

  // 3. Omitted active flag defaults to true (no silent parking of new pages).
  const parsedDefault = landingPageSchema.parse({ ...baseInput, name: "Default Page", slug: "default-page" });
  assert("schema defaults omitted active to true", parsedDefault.active === true);
  const defaulted = await createLandingPage(parsedDefault);
  assert("page created without explicit active is active", defaulted.active === true);

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll landing page active-status assertions passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
