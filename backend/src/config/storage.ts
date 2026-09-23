import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "./env";

/**
 * Storage adapter interface. Spec section 26 requires media to live in real
 * object storage, not Postgres — this local-disk implementation satisfies
 * that (the DB only ever stores URLs) while keeping Phase 3 runnable with
 * zero external accounts. To move to S3/Cloudinary/GCS in production,
 * implement this same `save()` signature against that provider's SDK and
 * swap the export at the bottom of this file — no controller/service code
 * needs to change.
 */
export interface StorageAdapter {
  /** Persists a buffer and returns its publicly-accessible URL. */
  save(params: { buffer: Buffer; subdir: "videos" | "images" | "thumbnails"; extension: string }): Promise<string>;
}

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

function publicBaseUrl(): string {
  if (env.PUBLIC_MEDIA_BASE_URL) return env.PUBLIC_MEDIA_BASE_URL.replace(/\/$/, "");
  return `http://localhost:${env.PORT}/media`;
}

class LocalDiskStorageAdapter implements StorageAdapter {
  async save(params: { buffer: Buffer; subdir: "videos" | "images" | "thumbnails"; extension: string }) {
    const dir = path.join(uploadRoot, params.subdir);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${crypto.randomUUID()}.${params.extension}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, params.buffer);

    return `${publicBaseUrl()}/${params.subdir}/${filename}`;
  }
}

export const storage: StorageAdapter = new LocalDiskStorageAdapter();
export { uploadRoot };
