import { gunzipSync, gzipSync } from "node:zlib";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Catalog } from "./types";

// Private bucket created by migration 0010; only the service role can use it.
const BUCKET = "catalog-snapshots";

/** Gzip a catalog into the bucket; returns its object path. */
export async function uploadSnapshot(service: SupabaseClient, storeId: string, catalog: Catalog): Promise<string> {
  const path = `${storeId}/${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`;
  const body = gzipSync(JSON.stringify(catalog));
  const { error } = await service.storage.from(BUCKET).upload(path, body, { contentType: "application/gzip" });
  if (error) throw new Error(`Couldn't save the catalog snapshot: ${error.message}`);
  return path;
}

/** Read a snapshot back. Null if it's missing or unreadable. */
export async function downloadSnapshot(service: SupabaseClient, path: string): Promise<Catalog | null> {
  const { data, error } = await service.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  try {
    return JSON.parse(gunzipSync(Buffer.from(await data.arrayBuffer())).toString("utf8")) as Catalog;
  } catch {
    return null;
  }
}
