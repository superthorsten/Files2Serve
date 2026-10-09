import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  copyDirectoryContents,
  copyTestDataUploads,
  removeDirectoryContents,
} from "./helpers";


test("Ablaufener Eintrag als abgelaufen markiert", async ({ page }) => {
  const FILENAME = "Starke_Männer_schaffen_gute_Zeiten.jpeg";
  const sourceEntries = await copyTestDataUploads("Abgelaufen");

  // Test durchzuführen und Testdaten anschließend löschen
  try {
    // Gehe zur internen Admin-Seite, um die Details anzuzeigen
    await page.goto("/internal-admin");

    // Suche die Zeile mit dem hochgeladenen File und öffne den Details-Dialog
    const fileRow = page.locator("tr").filter({ hasText: FILENAME });
    
    
    // Testes und erstelle bei Fehlschlag einen Screetshot
    await expect(fileRow.locator("span")).toHaveText("Abgelaufen", { timeout: 5000 }).catch(async () => {
      await page.screenshot({ path: "screenshot.png", fullPage: true });
      throw new Error("Test failed, screenshot saved as screenshot.png");
    });
  } finally {
    console.log("Removing test data from uploads directory...");
    await removeDirectoryContents(sourceEntries);
  }

});



// Hochladen von Dateien und checken, ob Daten vorhanden mitsamt den Einträgen in der toml-Datei. Danach wieder löschen, damit der Test wiederholt werden kann.
test("Eine große Datei hochladen", async ({ page }) => {
  
  //const FILENAME = "Langes_Video.webm"; // 1,2 GB
  const FILENAME = "Weihnachten.jpeg"; // 1,2 GB

  const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
  const filePath = path.resolve(__dirname, "..", "testdata", FILENAME);
  const entriesBeforeUpload = await readdir(uploadsDirectory);

  await page.goto("/internal-admin");
  await page.locator("#file").setInputFiles(filePath);
  await page.locator("#title").fill("Der lange Anlauf");

  await Promise.all([
    page.waitForURL("**/internal-admin"),
    page.getByRole("button", { name: "Upload bestätigen" }).click(),
  ]);

  // Muss gesucht werden, da Ordnername zufällig generiert wird
  const entriesAfterUpload = await readdir(uploadsDirectory, { withFileTypes: true });
  const uploadDirectory = entriesAfterUpload.find(
    (entry) => entry.isDirectory() && !entriesBeforeUpload.includes(entry.name),
  );

  expect(uploadDirectory).toBeDefined();
  const uploadedFilePath = path.join(uploadsDirectory, uploadDirectory!.name, FILENAME);
  const metadataFilePath = path.join(uploadsDirectory, `${uploadDirectory!.name}.toml`);

  
  try {
    // Check, ob vorhanden
    await expect.poll(async () => {
      return (await readdir(path.dirname(uploadedFilePath))).includes(FILENAME);
    }, {
      timeout: 60_000,
    }).toBe(true);
    const metadataFile = await readFile(metadataFilePath, "utf-8");
    expect(metadataFile).not.toContain("password =");
  } finally {
    // Daten wieder löschen, damit der Test wiederholt werden kann
    await rm(path.join(uploadsDirectory, uploadDirectory!.name), { recursive: true, force: true });
    await rm(metadataFilePath, { force: true });
  }
  
});


test("Datei mit allen Metadaten und Passwort hochladen", async ({ page }) => {
  const FILENAME = "Weihnachten.jpeg";
  const metadata = {
    title: "Weihnachten",
    id: "12345",
    password: "alleJahreWieder",
    expiry_date: "2099-12-31",
    description: "Weihnachtsbild mit allen Metadaten",
  };

  const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
  const filePath = path.resolve(__dirname, "..", "testdata", FILENAME);
  const entriesBeforeUpload = await readdir(uploadsDirectory);

  await page.goto("/internal-admin");
  await page.locator("#file").setInputFiles(filePath);
  await page.locator("#title").fill(metadata.title);
  await page.locator("#item-id").fill(metadata.id);
  await page.locator("#password-enabled").check();
  await page.locator("#password").fill(metadata.password);
  await page.locator("#expire_date").fill(metadata.expiry_date);
  await page.locator("#description").fill(metadata.description);

  await Promise.all([
    page.waitForURL("**/internal-admin"),
    page.getByRole("button", { name: "Upload bestätigen" }).click(),
  ]);

  const entriesAfterUpload = await readdir(uploadsDirectory, { withFileTypes: true });
  const uploadDirectory = entriesAfterUpload.find(
    (entry) => entry.isDirectory() && !entriesBeforeUpload.includes(entry.name),
  );

  expect(uploadDirectory).toBeDefined();

  const metadataFilePath = path.join(uploadsDirectory, `${uploadDirectory!.name}.toml`);
  const uploadedFilePath = path.join(uploadsDirectory, uploadDirectory!.name, FILENAME);

  const fileRow = page.locator("tr").filter({ hasText: metadata.title });
  await expect(page.locator("dialog")).toHaveCount(1);
  await fileRow.getByRole("button", { name: "Details" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(metadata.password);
  await expect(page.getByRole("dialog")).toContainText(uploadDirectory!.name);

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
        `upload_hash = ${JSON.stringify(uploadDirectory!.name)}`,
      ].every((line) => metadataFile.includes(line)); // Prüfen, ob alle Metadaten in der Datei enthalten sind
    }).toBe(true);
  } finally {
    await rm(path.join(uploadsDirectory, uploadDirectory!.name), { recursive: true, force: true });
    await rm(metadataFilePath, { force: true });
  }
});

// Details Dialog anzeige checken, ob Daten korrekt dargestellt sind
test("Details-Dialog Keine_Metadaten", async ({ page }) => {
  
  
  const sourceEntries = await copyTestDataUploads("Keine_Metadaten");


  const metadata = {
    title: "Böckenförde Diktum",
    id: "Keine",
    password: "Keines",
    expiry_date: "Keines",
    description: "Keine",
    upload_hash: "0679245553a40351",
  };

  const FILENAME = "Boeckenfoerde-Diktum.pdf";  


  
  // Kopiere die Testdateien in das Uploads-Verzeichnis, um den Test durchzuführen
  try {
    // Gehe zur internen Admin-Seite, um die Details anzuzeigen
    await page.goto("/internal-admin");

    // Suche die Zeile mit dem hochgeladenen File und öffne den Details-Dialog
    const fileRow = page.locator("tr").filter({ hasText: metadata.title });
    await fileRow.getByRole("button", { name: "Details" }).click();
  
    // Überprüfe, ob der Details-Dialog korrekt angezeigt wird und die Metadaten enthält
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(metadata.title);
    await expect(page.locator("#details-item-id")).toHaveText(metadata.id);
    await expect(page.locator("#details-password")).toHaveText(metadata.password);
    await expect(page.locator("#details-expiry-date")).toHaveText(metadata.expiry_date);
    await expect(page.locator("#details-description")).toHaveText(metadata.description);
    await expect(page.locator("#details-hash")).toHaveText(metadata.upload_hash);
  } finally {
    console.log("Removing test data from uploads directory...");
    await removeDirectoryContents(sourceEntries);
  }

});


test("Details-Dialog Alle_Metadaten_und_Passwort", async ({ page }) => {
  
  
  const sourceEntries = await copyTestDataUploads("Alle_Metadaten_und_Passwort");


  const metadata = {
    title: "Weihnachten",
    id: "2",
    password: "sexistisch",
    expiry_date: "2099-12-31",
    description: "Dies ist ein sexistisches Bild. Aber keine Angst, ist nur Spa\u00df!",
    upload_hash: "a5f62c22616ad282",
  };

  const FILENAME = "Weihnachten.jpeg";  


  
  // Kopiere die Testdateien in das Uploads-Verzeichnis, um den Test durchzuführen
  try {
    // Gehe zur internen Admin-Seite, um die Details anzuzeigen
    await page.goto("/internal-admin");

    // Suche die Zeile mit dem hochgeladenen File und öffne den Details-Dialog
    const fileRow = page.locator("tr").filter({ hasText: metadata.title });
    await fileRow.getByRole("button", { name: "Details" }).click();
  
    // Überprüfe, ob der Details-Dialog korrekt angezeigt wird und die Metadaten enthält
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(metadata.title);
    await expect(page.locator("#details-item-id")).toHaveText(metadata.id);
    await expect(page.locator("#details-password")).toHaveText(metadata.password);
    await expect(page.locator("#details-expiry-date")).toHaveText(metadata.expiry_date);
    await expect(page.locator("#details-description")).toHaveText(metadata.description);
    await expect(page.locator("#details-hash")).toHaveText(metadata.upload_hash);
  } finally {
    await removeDirectoryContents(sourceEntries);
  }

});


// Details Dialog Aktionen checken 
test("Details-Dialog Löschen", async ({ page }) => {
  
  const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
  const sourceEntries = await copyTestDataUploads("Alle_Metadaten_und_Passwort");

  
  const FILENAME = "Weihnachten.jpeg";
  const FOLDERNAME = "a5f62c22616ad282"; // Der Name des Ordners, der die Datei enthält
  const SETTINGS_FILENAME = `${FOLDERNAME}.toml`; // Der Name der Metadaten-Datei


  
  // Kopiere die Testdateien in das Uploads-Verzeichnis, um den Test durchzuführen
  try {
    // Gehe zur internen Admin-Seite, um die Details anzuzeigen
    await page.goto("/internal-admin");

    // Suche die Zeile mit dem hochgeladenen File und öffne den Details-Dialog
    const fileRow = page.locator("tr").filter({ hasText: FILENAME });
    await fileRow.getByRole("button", { name: "Löschen" }).click();
  
    // Prüfe, ob Eintrag gelöscht wurde (GUI)
    await expect(page.locator("tr").filter({ hasText: FILENAME })).toHaveCount(0);



    // Prüfe, ob Eintrag gelöscht wurde (Filesystem)
    await expect.poll(async () => {
      const directoryEntries = await readdir(uploadsDirectory);
      return !directoryEntries.includes(FOLDERNAME) && !directoryEntries.includes(SETTINGS_FILENAME);
    }).toBe(true);


  } finally {
    await removeDirectoryContents(sourceEntries);
  }
    

});
