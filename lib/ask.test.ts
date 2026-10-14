import { describe, expect, it } from "vitest";
import { AskRequestSchema, askFile, buildAskMessages } from "./ask";
import { buildFileContext, CONTEXT_MAX_CHARS } from "./file-context";
import { parseItem } from "./health-item";
import { parseReport } from "./report";

function vendor(content: string) {
  const seen: {
    url: string;
    body: { messages: { role: string; content: string }[] };
    auth: string | null;
  }[] = [];
  const impl: typeof fetch = async (input, init) => {
    seen.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")),
      auth: new Headers(init?.headers).get("authorization"),
    });
    return Response.json({ choices: [{ message: { role: "assistant", content } }] });
  };
  return { impl, seen };
}

const ask = (over: Record<string, unknown> = {}) =>
  AskRequestSchema.parse({
    messages: [{ role: "user", content: "What stands out?" }],
    context: "REPORT: Blood test",
    locale: "de",
    ...over,
  });

const report = parseReport({
  title: "Blood test",
  collected: "2026-10-01",
  provider: "Labor X",
  summary: "One value is low.",
  results: [
    {
      name: "Hämoglobin",
      analyte: "Hemoglobin",
      value: "118",
      unit: "g/L",
      low: 120,
      high: 160,
      flag: "normal",
    },
    { name: "Ferritin", value: "40", unit: "µg/L", low: 15, high: 150, flag: "normal" },
  ],
})!;
const medicine = parseItem({
  id: "i_1",
  createdAt: "2026-10-01T00:00:00Z",
  kind: "medication",
  name: "Metformin",
  dose: "500 mg",
  schedule: "morning",
})!;

describe("the file as text", () => {
  it("lists values with their range and what the numbers say, medicines and appointments too", () => {
    const text = buildFileContext([report], [medicine]);
    expect(text).toContain("REPORT: Blood test (2026-10-01), Labor X");
    expect(text).toContain("- Hemoglobin: 118 g/L (range 120–160) [LOW]");
    expect(text).toContain("[LOW]");
    expect(text).toContain("- Metformin, 500 mg, morning");
  });

  it("is bounded, and says when it was cut", () => {
    const big = Array.from({ length: 12 }, (_, i) =>
      parseReport({
        title: `Report ${i}`,
        collected: `2026-01-${String(i + 1).padStart(2, "0")}`,
        results: [],
      })!,
    );
    const text = buildFileContext(big, []);
    expect(text).toContain("Report 11");
    expect(text).not.toContain("Report 0\n");
    expect(text).toContain("only the newest part");
    expect(buildFileContext([], []).length).toBeLessThan(CONTEXT_MAX_CHARS);
  });
});

describe("AskRequestSchema", () => {
  it("must end on a question from the person", () => {
    expect(
      AskRequestSchema.safeParse({ messages: [{ role: "assistant", content: "Hi" }] }).success,
    ).toBe(false);
    expect(AskRequestSchema.safeParse({ messages: [] }).success).toBe(false);
  });
});

describe("buildAskMessages", () => {
  it("puts the file in tags, asks for the reader's language and keeps the rules", () => {
    const [system, user] = buildAskMessages(ask());
    expect(system!.content).toContain("<file>\nREPORT: Blood test\n</file>");
    expect(system!.content).toContain("Reply in German.");
    expect(system!.content).toContain("never a diagnosis");
    expect(system!.content).toContain("Answer ONLY from the file");
    expect(user).toEqual({ role: "user", content: "What stands out?" });
  });
});

describe("askFile", () => {
  it("calls nobody when no model is available", async () => {
    const { impl, seen } = vendor("x");
    expect(await askFile(ask(), { env: {}, fetchImpl: impl })).toEqual({
      ok: false,
      error: "not_configured",
    });
    expect(seen).toEqual([]);
  });

  it("answers from the shared chain, and from the reader's own key when given", async () => {
    const shared = vendor("Your ferritin is in range.");
    const a = await askFile(ask(), { env: { GROQ_API_KEY: "shared" }, fetchImpl: shared.impl });
    expect(a).toMatchObject({ ok: true, text: "Your ferritin is in range.", ownModel: false });
    expect(shared.seen[0]!.auth).toBe("Bearer shared");
    expect(shared.seen[0]!.body.messages[0]!.content).toContain("<file>");

    const own = vendor("ok");
    const b = await askFile(
      ask({ byok: { vendor: "mistral", apiKey: "reader-key", model: "mistral-large-latest" } }),
      { env: { GROQ_API_KEY: "shared" }, fetchImpl: own.impl },
    );
    expect(b).toMatchObject({ ok: true, ownModel: true });
    expect(own.seen[0]!.auth).toBe("Bearer reader-key");
  });

  it("refuses an own-model config outside the closed vendor list", async () => {
    const { impl, seen } = vendor("x");
    const out = await askFile(
      ask({ byok: { vendor: "https://evil.example", apiKey: "k", model: "m" } }),
      {
        env: { GROQ_API_KEY: "shared" },
        fetchImpl: impl,
      },
    );
    expect(out).toEqual({ ok: false, error: "bad_own_model" });
    expect(seen).toEqual([]);
  });
});
