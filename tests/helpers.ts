import { cp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";


export async function copyTestDataUploads(
  sourceData: string,
): Promise<Dirent[]> {
    const sourceDirectory = path.resolve(__dirname, "..", "testdata", "uploads", sourceData);
    const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
    const entries = await readdir(sourceDirectory, { withFileTypes: true });

  for (const entry of entries) {
    await cp(
      path.join(sourceDirectory, entry.name),
      path.join(uploadsDirectory, entry.name),
      { recursive: entry.isDirectory() },
    );
  }

  return entries;
}


export async function removeDirectoryContents(
  
  entries: Dirent[],
): Promise<void> {
  const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
  for (const entry of entries) {
    await rm(path.join(uploadsDirectory, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
}
