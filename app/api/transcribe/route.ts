import {
  ChainExhaustedError,
  createHealthTracker,
  looksLikeSilence,
  speechChain,
  speechConfigured,
  transcribe,
} from "@bitbaum/ai-kit";
import { callerKey, limits, tooMany } from "@/lib/limits";

/**
 * POST /api/transcribe — the server leg of the microphone (chatkit's Composer,
 * `voice.transcribeUrl`). Multipart `{ audio, locale }` → `{ text }`.
 *
 * Audio cannot be anonymised, so it is the one thing besides a photo that
 * leaves the browser as it is: it goes to the speech vendor and nowhere else,
 * it is not stored, and nothing about it is logged but which link served it.
 * /security says so. The words come back into the box, where the person can
 * edit them, and sending them runs the usual redaction.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** chatkit caps a take at two minutes; this is the server's own ceiling. */
const MAX_BYTES = 8 * 1024 * 1024;
const health = createHealthTracker();

export async function POST(request: Request) {
  const allowed = limits.transcribe.check(callerKey(request.headers, "transcribe"));
  if (!allowed.allowed) return tooMany(allowed);
  if (!speechConfigured(process.env)) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  try {
    const result = await transcribe({
      audio,
      filename: "dictation.webm",
      language: String(form.get("locale") ?? "") || undefined,
      chain: speechChain(),
      env: process.env,
      health,
      timeoutMs: 20_000,
      signal: request.signal,
    });
    console.warn(`[transcribe] served by ${result.id}`);
    const said = result.text.trim();
    return Response.json({ text: looksLikeSilence(said) ? "" : said });
  } catch (error) {
    if (error instanceof ChainExhaustedError) {
      return Response.json({ error: "busy" }, { status: 503 });
    }
    throw error;
  }
}
