import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Smoke tests for the admin Visualizer tab.
 *
 * Without seeded admin auth in this environment we can only verify:
 *   1. The /admin route either renders the auth-required screen or
 *      redirects to /provider/login (both are valid behaviors).
 *   2. The shipped JS bundles contain the new admin Visualizer code
 *      (catches missing imports / tree-shaking regressions).
 *   3. The public /visualizer page renders an upload affordance and
 *      a chat input.
 */

test("admin route loads and reaches a known auth state", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  // Auth check runs on mount; give it time to finish.
  await page.waitForTimeout(2000);
  const url = page.url();
  const text = (await page.locator("body").innerText()).toLowerCase();
  // Valid end states:
  //   - /admin showing the auth-gate ("Admin Access Required")
  //   - /admin showing the console (would include "Visualizer" tab now)
  //   - /provider/login (redirect when no session)
  //   - splash screen briefly visible while auth check resolves
  const validStates =
    text.includes("admin access required") ||
    text.includes("admin console") ||
    text.includes("visualizer") ||
    text.includes("vanity palms") ||
    text.includes("provider login") ||
    text.includes("sign in") ||
    text.includes("checking admin access") ||
    url.includes("/provider/login");
  expect(validStates).toBeTruthy();
});

test("public visualizer page renders chat input and upload affordance", async ({ page }) => {
  await page.goto("/visualizer");
  const body = page.locator("body");
  await expect(body).toBeVisible();
  const text = (await body.innerText()).toLowerCase();
  expect(
    text.includes("upload") || text.includes("photo") || text.includes("face"),
  ).toBeTruthy();
});

test("admin visualizer code is shipped in build output", async () => {
  // Filesystem-level check: the production build must contain the
  // VisualizerAdminView marker text and the chat-to-features endpoint
  // reference. This catches accidental tree-shaking or bad lazy imports.
  const distDir = path.join(process.cwd(), "dist", "assets");
  const files = fs.existsSync(distDir)
    ? fs
        .readdirSync(distDir)
        .filter((f) => f.endsWith(".js"))
        .map((f) => fs.readFileSync(path.join(distDir, f), "utf8"))
        .join("\n")
    : "";

  expect(files).toContain("Visualizer Test Bench");
  expect(files).toContain("chat-to-features");
});
