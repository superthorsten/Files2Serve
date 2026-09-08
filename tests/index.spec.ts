import { readdir, readFile, rm } from "node:fs/promises";
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

  // Muss gesucht werden, da Ordnername zufällig generiert wird
  const entriesAfterUpload = await readdir(uploadsDirectory, { withFileTypes: true });
  const uploadDirectory = entriesAfterUpload.find(
    (entry) => entry.isDirectory() && !entriesBeforeUpload.includes(entry.name),
  );

 
  expect(uploadDirectory).toBeDefined();
  const uploadedFilePath = path.join(uploadsDirectory, uploadDirectory!.name, FILENAME);

  
  
  try {
    // Check, ob vorhanden
    await expect.poll(async () => {
      return (await readdir(path.dirname(uploadedFilePath))).includes(FILENAME);
    }).toBe(true);
  } finally {
    // Daten wieder löschen, damit der Test wiederholt werden kann
    await rm(path.join(uploadsDirectory, uploadDirectory!.name), { recursive: true, force: true });
    await rm(path.join(uploadsDirectory, `${uploadDirectory!.name}.toml`), { force: true });
  }
  
});


test("Eine große Datei hochladen", async ({ page }) => {
  
  const FILENAME = "Der_lange_Anlauf.webm";

  const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
  const filePath = path.resolve(__dirname, "..", "testdata", FILENAME);
  const entriesBeforeUpload = await readdir(uploadsDirectory);

  await page.goto("/");
  await page.locator("#file").setInputFiles(filePath);
  await page.locator("#title").fill("Der lange Anlauf");

  await Promise.all([
    page.waitForURL("**/"),
    page.getByRole("button", { name: "Upload bestätigen" }).click(),
  ]);

  // Muss gesucht werden, da Ordnername zufällig generiert wird
  const entriesAfterUpload = await readdir(uploadsDirectory, { withFileTypes: true });
  const uploadDirectory = entriesAfterUpload.find(
    (entry) => entry.isDirectory() && !entriesBeforeUpload.includes(entry.name),
  );

 
  expect(uploadDirectory).toBeDefined();
  const uploadedFilePath = path.join(uploadsDirectory, uploadDirectory!.name, FILENAME);

  
  
  try {
    // Check, ob vorhanden
    await expect.poll(async () => {
      return (await readdir(path.dirname(uploadedFilePath))).includes(FILENAME);
    }, {
      timeout: 60_000,
    }).toBe(true);
  } finally {
    // Daten wieder löschen, damit der Test wiederholt werden kann
    await rm(path.join(uploadsDirectory, uploadDirectory!.name), { recursive: true, force: true });
    await rm(path.join(uploadsDirectory, `${uploadDirectory!.name}.toml`), { force: true });
  }
  
});




test("Datei mit allen Metadaten hochladen", async ({ page }) => {
  const FILENAME = "Weihnachten.jpeg";
  const metadata = {
    title: "Weihnachten",
    id: "12345",
    password: "geheim",
    expiry_date: "2099-12-31",
    description: "Weihnachtsbild mit allen Metadaten",
  };

  const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
  const filePath = path.resolve(__dirname, "..", "testdata", FILENAME);
  const entriesBeforeUpload = await readdir(uploadsDirectory);

  await page.goto("/");
  await page.locator("#file").setInputFiles(filePath);
  await page.locator("#title").fill(metadata.title);
  await page.locator("#item-id").fill(metadata.id);
  await page.locator("#password").fill(metadata.password);
  await page.locator("#expire_date").fill(metadata.expiry_date);
  await page.locator("#description").fill(metadata.description);

  await Promise.all([
    page.waitForURL("**/"),
    page.getByRole("button", { name: "Upload bestätigen" }).click(),
  ]);

  const entriesAfterUpload = await readdir(uploadsDirectory, { withFileTypes: true });
  const uploadDirectory = entriesAfterUpload.find(
    (entry) => entry.isDirectory() && !entriesBeforeUpload.includes(entry.name),
  );

  expect(uploadDirectory).toBeDefined();

  const metadataFilePath = path.join(uploadsDirectory, `${uploadDirectory!.name}.toml`);
  const uploadedFilePath = path.join(uploadsDirectory, uploadDirectory!.name, FILENAME);


  // Test falsche Metadaten

  try {
    await expect.poll(async () => {
      const directoryEntries = await readdir(path.dirname(uploadedFilePath));
      if (!directoryEntries.includes(FILENAME)) {
        return false;
      }

      const metadataFile = await readFile(metadataFilePath, "utf-8");
      return [
        `title = ${JSON.stringify(metadata.title)}`,
        `id = ${JSON.stringify(metadata.id)}`,
        `password = ${JSON.stringify(metadata.password)}`,
        `expiry_date = ${JSON.stringify(metadata.expiry_date)}`,
        `description = ${JSON.stringify(metadata.description)}`,
        `filename = ${JSON.stringify(FILENAME)}`,
      ].every((line) => metadataFile.includes(line));
    }).toBe(true);
  } finally {
    await rm(path.join(uploadsDirectory, uploadDirectory!.name), { recursive: true, force: true });
    await rm(metadataFilePath, { force: true });
  }
});
