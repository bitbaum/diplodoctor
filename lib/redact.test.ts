import { describe, expect, it } from "vitest";
import { applyRedactions, assignTokens, findPersonalData, mapStrings, restore } from "./redact";

/** Invented: the shape of a real Swiss letter, none of its contents. */
const LETTER = `Frau
Erika Muster
c/o Hans Beispiel
Musterweg 12
8001 Zürich

9. Oktober 2026
Anfrage Auslandaufenthalt

Sehr geehrte Frau Muster

Wir beziehen uns auf Ihr Gesuch vom 30. September 2026. Zur Behandlung benötigen wir:
1. Belege Ihrer Aufenthalte.
Bitte beantworten Sie unser Schreiben bis am 30. Oktober 2026.

ZEMIS Nr. 12345678 · Kant. Ref. Nr. ZH 1.234.567
AHV 756.1234.5678.97 · IBAN CH93 0076 2011 6238 5295 7
Tel. +41 44 123 45 67 · erika.muster@example.ch · geboren am 01.02.1980`;

const kinds = (text: string, own?: string[]) =>
  Object.fromEntries(findPersonalData(text, own).map((r) => [r.value, r.kind]));

describe("findPersonalData", () => {
  const found = kinds(LETTER);

  it("finds the person, the person they live with, and both their parts", () => {
    expect(found["Erika Muster"]).toBe("NAME");
    expect(found["Hans Beispiel"]).toBe("NAME");
    expect(found["Muster"]).toBe("NAME");
    expect(found["Erika"]).toBe("NAME");
  });

  it("finds the address", () => {
    expect(found["Musterweg 12"]).toBe("ADDRESS");
    expect(found["8001 Zürich"]).toBe("POSTCODE");
  });

  it("finds numbers that identify a person, keeping their labels out", () => {
    expect(found["12345678"]).toBe("REF");
    expect(found["ZH 1.234.567"]).toBe("REF");
    expect(found["756.1234.5678.97"]).toBe("AHV");
    expect(found["CH93 0076 2011 6238 5295 7"]).toBe("IBAN");
    expect(found["+41 44 123 45 67"]).toBe("PHONE");
    expect(found["erika.muster@example.ch"]).toBe("EMAIL");
    expect(found["01.02.1980"]).toBe("BIRTHDATE");
  });

  it("leaves what the analysis needs: dates, deadlines and the request", () => {
    const values = Object.keys(found).join(" | ");
    expect(values).not.toContain("2026");
    expect(values).not.toContain("Oktober");
    expect(values).not.toContain("Zur Behandlung");
    expect(values).not.toContain("Auslandaufenthalt");
  });

  it("hides the reader's own words, and each part of a name", () => {
    const own = kinds("Mit freundlichen Grüssen, Ali Beispielname", ["Ali Beispielname"]);
    expect(own["Ali Beispielname"]).toBe("NAME");
    expect(own["Beispielname"]).toBe("NAME");
  });

  it("reads French and Italian letters", () => {
    const fr = kinds("Madame Claire Exemple\nRue de la Gare 3\n1003 Lausanne\nN° 2026/1234");
    expect(fr["Claire Exemple"]).toBe("NAME");
    expect(fr["Rue de la Gare 3"]).toBe("ADDRESS");
    expect(fr["1003 Lausanne"]).toBe("POSTCODE");
    expect(fr["2026/1234"]).toBe("REF");
    expect(kinds("Gentile Signora Rossi, Via Roma 5")["Via Roma 5"]).toBe("ADDRESS");
  });
});

describe("redacting and restoring", () => {
  const redactions = assignTokens(findPersonalData(LETTER));
  const sent = applyRedactions(LETTER, redactions);

  it("sends none of the personal values", () => {
    for (const secret of [
      "Erika",
      "Muster",
      "Beispiel",
      "Musterweg",
      "8001",
      "12345678",
      "1.234.567",
      "756.1234",
      "CH93",
      "123 45 67",
      "@example.ch",
      "1980",
    ]) {
      expect(sent).not.toContain(secret);
    }
  });

  it("keeps the request, the dates and the labels", () => {
    expect(sent).toContain("bis am 30. Oktober 2026");
    expect(sent).toContain("Gesuch vom 30. September 2026");
    expect(sent).toContain("Sehr geehrte Frau [NAME-");
    expect(sent).toContain("ZEMIS Nr. [REF-");
  });

  it("gives one value one placeholder, wherever it appears", () => {
    const muster = redactions.find((r) => r.value === "Muster")?.token;
    expect(sent).toContain(`Sehr geehrte Frau ${muster}`);
    expect(sent.split(muster ?? "∅").length).toBeGreaterThan(1);
  });

  it("restores the letter exactly", () => {
    expect(restore(sent, redactions)).toBe(LETTER);
  });

  it("restores placeholders inside a model's answer, and leaves unknown ones alone", () => {
    const answer = {
      title: "Office asks [NAME-1] for documents",
      asks: [{ text: "Send to [ADDRESS-1]", evidence: ["[NAME-99]"] }],
    };
    expect(mapStrings(answer, (s) => restore(s, redactions))).toEqual({
      title: `Office asks ${redactions.find((r) => r.token === "[NAME-1]")?.value} for documents`,
      asks: [{ text: "Send to Musterweg 12", evidence: ["[NAME-99]"] }],
    });
  });

  it("matches across line breaks and spacing differences", () => {
    const r = assignTokens([{ value: "Erika Muster", kind: "NAME" }]);
    expect(applyRedactions("Erika\n  Muster", r)).toBe("[NAME-1]");
    expect(applyRedactions("ERIKA MUSTER", r)).toBe("[NAME-1]");
    expect(applyRedactions("Erikas", r)).toBe("Erikas");
  });
});

describe("the anonymised export", () => {
  it("replaces every value it knows, and does not carry the table along", async () => {
    const { anonymisedReport } = await import("./report-export");
    const { parseReport } = await import("./report");
    const redactions = assignTokens(findPersonalData(LETTER));
    const full = parseReport({
      title: "Report for Erika Muster",
      collected: "2026-10-30",
      texts: [{ lang: "de", text: LETTER }],
      notes: ["Erika Muster\nMusterweg 12\n8001 Zürich"],
      redactions,
    });
    if (!full) throw new Error("not a report");
    const out = anonymisedReport(full);
    const json = JSON.stringify(out);
    for (const secret of ["Erika", "Muster", "Musterweg", "12345678", "756.1234", "@example.ch"]) {
      expect(json).not.toContain(secret);
    }
    expect(out.redactions).toEqual([]);
    expect(out.collected).toBe("2026-10-30");
    expect(out.title).toMatch(/^Report for \[NAME-\d+\]$/);
  });
});

describe("medical documents", () => {
  const found = (text: string) =>
    Object.fromEntries(findPersonalData(text).map((f) => [f.value, f.kind]));

  it("hides the patient, the birth date and the order number of a laboratory report", () => {
    const f = found(
      "Patientin: Erika Muster, geboren 14.03.1985\nAuftragsnummer: 2026-091415\nHämoglobin 118 g/L 120 - 160 L",
    );
    expect(f["Erika Muster"]).toBe("NAME");
    expect(f["Muster"]).toBe("NAME");
    expect(f["14.03.1985"]).toBe("BIRTHDATE");
    expect(f["2026-091415"]).toBe("REF");
  });

  it("reads the register form Name: Muster, Erika", () => {
    const f = found("Name: Muster, Erika\nVersichertennummer: 756.1234.5678.97");
    expect(f["Muster, Erika"]).toBe("NAME");
    expect(f["Erika"]).toBe("NAME");
    expect(f["756.1234.5678.97"]).toBe("AHV");
  });

  it("reads French, Italian and Spanish labels", () => {
    expect(found("Patient : Jean Dupont")["Jean Dupont"]).toBe("NAME");
    expect(found("Paziente: Maria Rossi")["Maria Rossi"]).toBe("NAME");
    expect(found("Paciente: Ana Pérez")["Ana Pérez"]).toBe("NAME");
    expect(found("N° patient : 48213977")["48213977"]).toBe("REF");
    expect(found("Número de historia: 55-1234")["55-1234"]).toBe("REF");
  });

  it("does not hide a measurement or a table header", () => {
    const f = found(
      "Name Wert Einheit\nHämoglobin 118 g/L\nFerritin 14 µg/L\nName des Tests: Blutbild",
    );
    expect(Object.keys(f)).toEqual([]);
  });

  it("does not hide the laboratory", () => {
    expect(
      found("Patientin: Erika Muster\nMedizinisches Labor Beispiel AG")[
        "Medizinisches Labor Beispiel AG"
      ],
    ).toBeUndefined();
  });
});
