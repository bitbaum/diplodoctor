import { AnalyzeRequestSchema, analyzeReport, type AnalyzeError } from "@/lib/analyze";
import { callerKey, limits, tooMany } from "@/lib/limits";

/**
 * POST /api/analyze — a medical document (text and/or photos of it) becomes a health file.
 *
 * Thin on purpose: validation is the zod schema, the model call is ai-kit's,
 * the rate limit is limitkit's. See lib/analyze.ts for why.
 *
 * Nothing is stored here. The document goes to the model and the result goes
 * back to the browser, which is the only place a report is kept. Nothing about
 * the document is logged either — only which link served it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<AnalyzeError, number> = {
  not_configured: 503,
  no_vision: 422,
  busy: 503,
  unreadable_analysis: 502,
  bad_own_model: 400,
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const empty = parsed.error.issues.some((i) => i.message === "empty");
    return Response.json({ error: empty ? "empty" : "bad_request" }, { status: 400 });
  }

  const own = parsed.data.byok !== undefined && parsed.data.byok !== null;
  const limiter = own ? limits.analyzeOwn : limits.analyzeFree;
  const allowed = limiter.check(callerKey(request.headers, own ? "analyze-own" : "analyze"));
  if (!allowed.allowed) return tooMany(allowed);

  const outcome = await analyzeReport(parsed.data, { env: process.env, signal: request.signal });
  if (!outcome.ok) {
    return Response.json({ error: outcome.error }, { status: STATUS[outcome.error] });
  }
  console.warn(`[analyze] served by ${outcome.servedBy}${outcome.ownModel ? " (own key)" : ""}`);
  return Response.json({ report: outcome.report, ownModel: outcome.ownModel });
}
