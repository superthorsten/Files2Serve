import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { copyTestDataUploads, removeDirectoryContents } from "./helpers";

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
  
  const sourceEntries = await copyTestDataUploads("Keine_Metadaten");
  const FILENAME = "Boeckenfoerde-Diktum.pdf";
  
  try {
    const validHash = "0679245553a40351";
    await page.locator("#upload-hash").fill(validHash);
    await page.getByRole("button", { name: "Anzeigen" }).click();

    await expect(page).toHaveURL(`/download.html?upload_hash=${validHash}`);

    await expect(page.getByText(FILENAME, { exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Datei herunterladen" }).click();
    const download = await downloadPromise;

    // persistente Speicherung
    await download.saveAs(`/home/thorsten/Downloads/${download.suggestedFilename()}`);

    expect(download.suggestedFilename()).toBe(FILENAME);
    const downloadedFile = await readFile(await download.path());
    const sourceFile = await readFile(
      path.resolve(__dirname, "..", "testdata", "uploads", "Keine_Metadaten", "0679245553a40351", FILENAME),
    );
    
    console.log("Downloaded file path:", await download.path());
    expect(downloadedFile).toEqual(sourceFile);
  } finally {
    await removeDirectoryContents(sourceEntries);
  }       
  
});

test("Abgelaufener Download zeigt keinen Download-Button und bleibt gesperrt", async ({ page }) => {
  const sourceEntries = await copyTestDataUploads("Keine_Metadaten");
  const uploadHash = "0679245553a40351";
  const metadataFile = path.resolve(__dirname, "..", "uploads", `${uploadHash}.toml`);

  try {
    const metadata = await readFile(metadataFile, "utf-8");
    await writeFile(metadataFile, metadata.replace('expiry_date = ""', 'expiry_date = "2000-01-01"'));

    await page.goto(`/download.html?upload_hash=${uploadHash}`);

    await expect(page.getByRole("heading", { name: "Download abgelaufen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Datei herunterladen" })).toHaveCount(0);

    const response = await page.request.post(`/download/${uploadHash}/file`);
    expect(response.status()).toBe(410);
  } finally {
    await removeDirectoryContents(sourceEntries);
  }
});


test("Gültiger Download-Hash mit Passwort ohne Passworteingabe", async ({ page }) => {
  await page.goto("/");
  const startPageUrl = page.url();
  
  const sourceEntries = await copyTestDataUploads("Alle_Metadaten_und_Passwort");
  const FILENAME = "Weihnachten.jpeg";
  
  
  try {
    const validHash = "a5f62c22616ad282";
    await page.locator("#upload-hash").fill(validHash);
    await page.getByRole("button", { name: "Anzeigen" }).click();

    await expect(page).toHaveURL(`/download.html?upload_hash=${validHash}`);

    await expect(page.getByText(FILENAME, { exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 1000 }).catch(() => null);
    await page.getByRole("button", { name: "Datei herunterladen" }).click();
    
    await expect(page).toHaveURL(`/download/${validHash}/file`);
    await expect(page.getByRole("alert")).toHaveText("Ungültiges Passwort");
    expect(await downloadPromise).toBeNull();
  } finally {
    await removeDirectoryContents(sourceEntries);
  }    
  
  
  
});

test("Gültiger Download-Hash mit Passwort mit falscher Passworteingabe", async ({ page }) => {
  await page.goto("/");
  const startPageUrl = page.url();
  
  const sourceEntries = await copyTestDataUploads("Alle_Metadaten_und_Passwort");
  const FILENAME = "Weihnachten.jpeg";
  
  
  try {
    const validHash = "a5f62c22616ad282";
    await page.locator("#upload-hash").fill(validHash);
    await page.getByRole("button", { name: "Anzeigen" }).click();

    await expect(page).toHaveURL(`/download.html?upload_hash=${validHash}`);

    await expect(page.getByText(FILENAME, { exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 1000 }).catch(() => null);
    await page.locator("#download-password").fill("falsches Passwort");
    await page.getByRole("button", { name: "Datei herunterladen" }).click();
    
    
    
    await expect(page).toHaveURL(`/download/${validHash}/file`);
    await expect(page.getByRole("alert")).toHaveText("Ungültiges Passwort");
    expect(await downloadPromise).toBeNull();
  } finally {
    await removeDirectoryContents(sourceEntries);
  }    
  
  
  
});