import { readdir, rm } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

test("zeigt Files2Serve auf der Startseite an", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Files2Serve", { exact: true })).toBeVisible();
});

test("Eine kleine Datei hochladen", async ({ page }) => {
  
  const FILENAME = "Weihnachten.jpeg";

  const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
  const filePath = path.resolve(__dirname, "..", "testdata", FILENAME);
  const entriesBeforeUpload = await readdir(uploadsDirectory);

  await page.goto("/");
  await page.locator("#file").setInputFiles(filePath);
  await page.locator("#title").fill("Weihnachten");

  await Promise.all([
    page.waitForURL("**/"),
    page.getByRole("button", { name: "Upload bestätigen" }).click(),
  ]);

  const entriesAfterUpload = await readdir(uploadsDirectory, { withFileTypes: true });
  const uploadDirectory = entriesAfterUpload.find(
    (entry) => entry.isDirectory() && !entriesBeforeUpload.includes(entry.name),
  );

 
  expect(uploadDirectory).toBeDefined();
  const uploadedFilePath = path.join(uploadsDirectory, uploadDirectory!.name, FILENAME);

  
  
  try {
    // Check, ob vorhanden
    await expect.poll(async () => (await readdir(path.dirname(uploadedFilePath))).includes(FILENAME)).toBe(true);
  } finally {
    // Daten wieder löschen, damit der Test wiederholt werden kann
    await rm(path.join(uploadsDirectory, uploadDirectory!.name), { recursive: true, force: true });
    await rm(path.join(uploadsDirectory, `${uploadDirectory!.name}.toml`), { force: true });
  }
  
});
