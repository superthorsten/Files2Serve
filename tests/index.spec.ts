import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

test("zeigt Files2Serve auf der Startseite an", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Files2Serve", { exact: true })).toBeVisible();
  await expect(page.locator("#upload-form")).toHaveCount(0);
  await expect(page.locator("#upload-hash")).toBeVisible();
});

test("Ungültiger Download-Hash", async ({ page }) => {
  await page.goto("/");
  const startPageUrl = page.url();
  const invalidHash = randomUUID().replaceAll("-", "").slice(0, 16);

  await page.locator("#upload-hash").fill(invalidHash);
  await page.getByRole("button", { name: "Anzeigen" }).click();

  await expect(page).toHaveURL(startPageUrl);
  await expect(page.getByText("Files2Serve", { exact: true })).toBeVisible();
  await expect(page.locator("#upload-hash")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText("Ungültiger Download-Hash");
});

test("Gültiger Download-Hash ohne Passwort", async ({ page }) => {
  await page.goto("/");
  const startPageUrl = page.url();
  
  const sourceEntries = await copyDirectoryContents(sourceDirectory, uploadsDirectory);


  
});

