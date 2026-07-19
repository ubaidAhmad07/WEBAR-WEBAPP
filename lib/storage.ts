import fs from "node:fs/promises";
import path from "node:path";

/**
 * Storage seam for the Supabase/R2 swap at deploy time.
 * Keys are forward-slash paths like "models/abc.glb".
 */
export interface StorageAdapter {
  put(key: string, data: Buffer | Uint8Array): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Public URL the browser can fetch. */
  url(key: string): string;
}

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

function resolveKey(key: string): string {
  const cleaned = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.resolve(UPLOADS_DIR, cleaned);
  if (!abs.startsWith(path.resolve(UPLOADS_DIR))) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return abs;
}

class LocalDiskStorage implements StorageAdapter {
  async put(key: string, data: Buffer | Uint8Array): Promise<void> {
    const abs = resolveKey(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data);
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  url(key: string): string {
    return `/api/files/${key.replace(/^\/+/, "")}`;
  }
}

export const storage: StorageAdapter = new LocalDiskStorage();
