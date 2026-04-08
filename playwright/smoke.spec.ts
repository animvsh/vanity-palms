import { expect, test } from "@playwright/test";

test("public routes load", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText("Vanity Palms");

  await page.goto("/providers");
  await expect(page.locator("body")).toContainText("Find providers");

  await page.goto("/about");
  await expect(page.locator("body")).toContainText("Vanity Palms");
});
