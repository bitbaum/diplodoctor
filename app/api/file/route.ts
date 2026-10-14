import { requireUser } from "@/lib/auth/require";
import { callerKey, limits, tooMany } from "@/lib/limits";
import {
  cleanData,
  deleteFile,
  FilePutSchema,
  MAX_FILE_BYTES,
  readFile,
  writeFile,
} from "@/lib/health-file";
import { canSeal } from "@/lib/secrets";

/**
 * GET/PUT/DELETE /api/file — the signed-in person's own health file, kept on
 * the server only if they turned it on. The row existing is the switch: GET
 * says whether it is on, the first PUT (version 0) turns it on, DELETE turns it
 * off and removes the copy. Nothing here is logged beyond the status code.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

async function guard(request: Request) {
  const { user, response } = await requireUser(request);
  if (response) return { response };
  const allowed = limits.file.check(callerKey(request.headers, `file:${user.id}`));
  if (!allowed.allowed) return { response: tooMany(allowed) };
  if (!canSeal()) return { response: json({ error: "not_available" }, 503) };
  return { user };
}

export async function GET(request: Request) {
  const g = await guard(request);
  if (g.response) return g.response;
  return json(await readFile(g.user.id));
}

export async function PUT(request: Request) {
  const g = await guard(request);
  if (g.response) return g.response;
  const text = await request.text();
  if (text.length > MAX_FILE_BYTES) return json({ error: "too_large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = FilePutSchema.safeParse(body);
  if (!parsed.success) return json({ error: "bad_request" }, 400);

  const result = await writeFile(g.user.id, parsed.data.version, cleanData(parsed.data.data));
  if (result.ok) return json({ enabled: true, version: result.version });
  // The other device got there first: hand back what is stored so the client can merge.
  return json({ error: "conflict", current: await readFile(g.user.id) }, 409);
}

export async function DELETE(request: Request) {
  const g = await guard(request);
  if (g.response) return g.response;
  await deleteFile(g.user.id);
  return json({ enabled: false });
}
