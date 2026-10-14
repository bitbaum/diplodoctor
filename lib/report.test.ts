import { describe, expect, it } from "vitest";
import { attentionFloor, computeFlag, parseNumber, parseReport } from "./report";
import { previousValue } from "./report-trends";
import { SAMPLE_FLAGGED, sampleReport } from "./sample";

const base = { title: "Blood test", kind: "lab" };
const result = (over: Record<string, unknown>) => ({ name: "Hämoglobin", value: "118", ...over });

describe("parseNumber", () => {
  it("reads a number as a laboratory prints it", () => {
    expect(parseNumber("5.8")).toBe(5.8);
    expect(parseNumber("5,8")).toBe(5.8);
    expect(parseNumber("1'250")).toBe(1250);
    expect(parseNumber("1 250")).toBe(1250);
    expect(parseNumber("-0.4")).toBe(-0.4);
  });
  it("does not read what is not a plain number", () => {
    for (const raw of ["<0.5", "negative", "5.8-6.1", "", "5.8 g", "1e3"]) expect(parseNumber(raw)).toBeNull();
  });
});

describe("computeFlag", () => {
  it("compares the value with the printed bounds", () => {
    expect(computeFlag("118", 120, 160)).toBe("low");
    expect(computeFlag("120", 120, 160)).toBe("normal"); // the bound itself is inside
    expect(computeFlag("160", 120, 160)).toBe("normal");
    expect(computeFlag("160.1", 120, 160)).toBe("high");
    expect(computeFlag("3.9", undefined, 3)).toBe("high"); // "< 3.0"
    expect(computeFlag("1.6", 1.2, undefined)).toBe("normal"); // "> 1.2"
  });
  it("says nothing when the numbers do not decide it", () => {
    expect(computeFlag("negative", 0, 1)).toBeNull();
    expect(computeFlag("5.8")).toBeNull();
  });
});

describe("a result in a report", () => {
  const flagOf = (over: Record<string, unknown>) => parseReport({ ...base, results: [result(over)] })!.results[0];

  it("takes its flag from the numbers, not from the model", () => {
    expect(flagOf({ low: 120, high: 160, flag: "normal" }).flag).toBe("low");
    expect(flagOf({ low: 100, high: 160, flag: "high" }).flag).toBe("normal");
    expect(flagOf({ low: 120, high: 160, flag: "normal" }).checked).toBe(true);
  });
  it("accepts bounds sent as strings", () => {
    expect(flagOf({ low: "120", high: "160" }).flag).toBe("low");
  });
  it("keeps the model's flag, and says it was not checked, when there is no range to check against", () => {
    const r = flagOf({ flag: "high" });
    expect(r.flag).toBe("high");
    expect(r.checked).toBe(false);
  });
  it("lets only the report call a value critical, and never lets the numbers be contradicted into normal", () => {
    expect(flagOf({ low: 120, high: 160, flag: "critical" }).flag).toBe("critical");
    expect(flagOf({ low: 100, high: 160, flag: "critical" }).flag).toBe("normal");
  });
  it("is unknown when nothing says otherwise, and for any flag it does not know", () => {
    expect(flagOf({}).flag).toBe("unknown");
    expect(flagOf({ flag: "alarming" }).flag).toBe("unknown");
  });
  it("drops a result without a name or a value and keeps the rest", () => {
    const r = parseReport({ ...base, results: [{ value: "1" }, result({}), { name: "x" }, "nonsense"] });
    expect(r?.results.map((x) => x.name)).toEqual(["Hämoglobin"]);
  });
});

describe("attention", () => {
  it("is never lower than the values imply", () => {
    const high = { low: 120, high: 160 };
    expect(parseReport({ ...base, attention: "routine", results: [result(high)] })?.attention).toBe("soon");
    expect(parseReport({ ...base, attention: "routine", results: [result({ ...high, flag: "critical" })] })?.attention).toBe("urgent");
  });
  it("may be higher than the values imply", () => {
    expect(parseReport({ ...base, attention: "urgent", results: [] })?.attention).toBe("urgent");
  });
  it("is routine when every value is in range", () => {
    expect(attentionFloor([{ flag: "normal" }, { flag: "unknown" }])).toBe("routine");
  });
});

describe("parseReport", () => {
  it("needs a title and nothing else", () => {
    expect(parseReport({ title: "x" })?.kind).toBe("other");
    expect(parseReport({ summary: "no title" })).toBeNull();
    expect(parseReport("nonsense")).toBeNull();
  });
  it("drops a bad date instead of failing", () => {
    expect(parseReport({ title: "x", collected: "yesterday" })?.collected).toBeUndefined();
    expect(parseReport({ title: "x", collected: "2026-09-14" })?.collected).toBe("2026-09-14");
  });
  it("gives every result and follow-up an id, and every text a label", () => {
    const r = parseReport({ title: "x", results: [result({}), result({ name: "Ferritin" })], followUps: [{ text: "Repeat in 3 months" }], texts: [{ lang: "de", text: "t" }] })!;
    expect(r.results.map((x) => x.id)).toEqual(["r1", "r2"]);
    expect(r.followUps[0]).toMatchObject({ id: "f1", done: false });
    expect(r.texts[0].label).toBe("de");
  });
  it("survives a round trip through JSON, which is what export and import are", () => {
    const sample = sampleReport("en");
    expect(parseReport(JSON.parse(JSON.stringify(sample)))).toEqual(sample);
  });
});

describe("the sample report", () => {
  it.each(["en", "de", "fr", "it", "es"] as const)("flags exactly the four values the report marks, in %s", (locale) => {
    const flagged = sampleReport(locale).results.filter((r) => r.flag !== "normal");
    expect(flagged.map((r) => r.name).toSorted()).toEqual([...SAMPLE_FLAGGED].toSorted());
    expect(flagged.map((r) => r.flag).toSorted()).toEqual(["high", "low", "low", "low"]);
    expect(sampleReport(locale).attention).toBe("soon");
  });
  it("explains the flagged values and only those", () => {
    for (const r of sampleReport("en").results) expect(Boolean(r.note)).toBe(r.flag !== "normal");
  });
  it("quotes the line each value was read from", () => {
    for (const r of sampleReport("en").results) expect(sampleReport("en").texts[0].text).toContain(r.quote!.split("  ")[0]);
  });
});

describe("previousValue", () => {
  const at = (id: string, collected: string, value: string, unit = "g/L", analyte = "Hemoglobin") =>
    parseReport({ id, title: id, collected, results: [{ name: "Hb", analyte, value, unit }] })!;

  it("finds the latest earlier report with the same measurement", () => {
    const now = at("c", "2026-09-14", "118");
    const prev = previousValue(now.results[0], now, [now, at("a", "2026-01-10", "131"), at("b", "2026-05-02", "125")]);
    expect(prev).toMatchObject({ value: "125", date: "2026-05-02", reportId: "b", direction: "down" });
  });
  it("matches across languages by the English name", () => {
    const now = at("c", "2026-09-14", "118");
    const earlier = parseReport({ id: "a", title: "a", collected: "2026-01-10", results: [{ name: "Hämoglobin", analyte: "hemoglobin", value: "131", unit: "g/L" }] })!;
    expect(previousValue(now.results[0], now, [earlier])?.value).toBe("131");
  });
  it("does not compare different units, and does not look forward", () => {
    const now = at("c", "2026-09-14", "118");
    expect(previousValue(now.results[0], now, [at("a", "2026-01-10", "13.1", "g/dL")])).toBeNull();
    expect(previousValue(now.results[0], now, [at("z", "2026-12-01", "120")])).toBeNull();
  });
  it("gives no direction for a value that is not a number", () => {
    const now = at("c", "2026-09-14", "negative");
    expect(previousValue(now.results[0], now, [at("a", "2026-01-10", "negative")])?.direction).toBeNull();
  });
});
