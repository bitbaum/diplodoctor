import { freeAvailability } from "@/lib/analyze";
import { authStatus } from "@/lib/auth/server";
import { buildCommit, probeDatabase, summarise } from "@/lib/health";
import { mailConfigured } from "@/lib/mail";

/**
 * GET /api/health — the one thing to curl after a deploy, and what the Live
 * check workflow and the auto-merge reconciler read. 200 only when the
 * database is reachable AND the app can read its own tables; 503 otherwise,
 * with the same body saying which part is missing.
 *
 * `analysis` is whether a report can be read without the reader's own key; the
 * intake page reads it to say what will happen. Booleans only: which vendors
 * are keyed is nobody's business, and no key or hint is ever returned.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const analysis = freeAvailability(process.env);
  const health = summarise({
    commit: buildCommit(),
    db: await probeDatabase(),
    accounts: authStatus().ready,
    mail: mailConfigured(),
    ai: analysis.text,
  });
  return Response.json(
    { ...health, analysis },
    { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
