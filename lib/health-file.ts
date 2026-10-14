import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { parseItem, type HealthItem } from "./health-item";
import { parseReport, type ReportFile } from "./report";
import { open, seal } from "./secrets";

/**
 * A person's health file as the server keeps it, when they ask it to: one
 * document, sealed (lib/secrets.ts), replaced as a whole under an optimistic
 * version so a second device cannot silently overwrite the first.
 *
 * What goes in is parsed by the same schemas the browser uses; anything that
 * does not parse is dropped rather than stored, so a bad client cannot park
 * junk in a record that is read back later.
 */
export const MAX_FILE_BYTES = 4_000_000;
const MAX_REPORTS = 500;
const MAX_ITEMS = 2000;

export interface HealthFileData {
  reports: ReportFile[];
  items: HealthItem[];
}

export const FilePutSchema = z.object({
  /** The version the client last saw; 0 to create. */
  version: z.number().int().min(0),
  data: z.object({
    reports: z.array(z.unknown()).max(MAX_REPORTS),
    items: z.array(z.unknown()).max(MAX_ITEMS),
  }),
});

export function cleanData(input: { reports: unknown[]; items: unknown[] }): HealthFileData {
  return {
    reports: input.reports.flatMap((r) => parseReport(r) ?? []),
    items: input.items.flatMap((i) => parseItem(i) ?? []),
  };
}

const context = (userId: string) => `health-file:${userId}`;

export type ReadResult =
  { enabled: false } | { enabled: true; version: number; data: HealthFileData };

export async function readFile(userId: string): Promise<ReadResult> {
  const [row] = await getDb()
    .select()
    .from(schema.healthFile)
    .where(eq(schema.healthFile.userId, userId))
    .limit(1);
  if (!row) return { enabled: false };
  try {
    const raw = JSON.parse(open(row.sealed, context(userId))) as {
      reports?: unknown[];
      items?: unknown[];
    };
    return {
      enabled: true,
      version: row.version,
      data: cleanData({ reports: raw.reports ?? [], items: raw.items ?? [] }),
    };
  } catch {
    // Sealed under a key that has since changed: report it as empty, never crash a page.
    return { enabled: true, version: row.version, data: { reports: [], items: [] } };
  }
}

export type WriteResult = { ok: true; version: number } | { ok: false; conflict: true };

/** Create (expected 0) or replace (expected = the version the caller read). */
export async function writeFile(
  userId: string,
  expected: number,
  data: HealthFileData,
): Promise<WriteResult> {
  const sealed = seal(JSON.stringify(data), context(userId));
  const db = getDb();
  if (expected === 0) {
    const inserted = await db
      .insert(schema.healthFile)
      .values({ userId, sealed, version: 1 })
      .onConflictDoNothing()
      .returning({ version: schema.healthFile.version });
    return inserted[0] ? { ok: true, version: inserted[0].version } : { ok: false, conflict: true };
  }
  const updated = await db
    .update(schema.healthFile)
    .set({ sealed, version: expected + 1 })
    .where(and(eq(schema.healthFile.userId, userId), eq(schema.healthFile.version, expected)))
    .returning({ version: schema.healthFile.version });
  return updated[0] ? { ok: true, version: updated[0].version } : { ok: false, conflict: true };
}

export async function deleteFile(userId: string): Promise<void> {
  await getDb().delete(schema.healthFile).where(eq(schema.healthFile.userId, userId));
}
