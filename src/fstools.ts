import { copyFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import { Dirent } from "node:fs";
import { join } from "node:path";

export async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries.filter((f: Dirent) => f.isFile()).map((f: Dirent) => f.name);
  return files;
}

export async function ensureDirectory(parent: string, name: string) {
  const path = join(parent, name);
  await mkdir(path, { recursive: true });
}

export async function move(
  fileName: string,
  sourceDirectory: string,
  destinationDirectory: string,
  subdirectory: string
) {
  const originalLocation = join(sourceDirectory, fileName);
  const targetLocation = join(destinationDirectory, subdirectory, fileName);

  await doMove(originalLocation, targetLocation);
}
export async function undo(
  fileName: string,
  sourceDirectory: string,
  destinationDirectory: string,
  subdirectory: string
) {
  const originalLocation = join(sourceDirectory, fileName);
  const currentLocation = join(destinationDirectory, subdirectory, fileName);

  await doMove(currentLocation, originalLocation);
}

async function doMove(source: string, destination: string, attempt = 0) {
  try {
    await rename(source, destination);
  } catch (err) {
    if (err.code == "EBUSY" && attempt <= 50) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await doMove(source, destination, attempt + 1);
      return;
    }
    if (err.code !== "EXDEV") {
      throw err;
    }

    await copyFile(source, destination);
    await rm(source);
  }
}
