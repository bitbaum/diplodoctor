import { describe, expect, it } from "vitest";
import en from "../messages/en.json";

/**
 * Words are a cost. Every sentence on a page is read, skipped or resented, and
 * a page that grows a sentence at a time ends up a document nobody opens. So the
 * pages people land on have a word budget, and this fails when one is passed.
 * To add copy, cut copy: the budget is the point, not an obstacle.
 *
 * Counted in English, the source language; the others are translations of it.
 * Reference pages (platform, security) are for readers who chose to read, and
 * have a ceiling rather than a target.
 */
type Tree = { [key: string]: string | Tree };

function words(tree: string | Tree): number {
  return typeof tree === "string"
    ? tree.trim().split(/\s+/).filter(Boolean).length
    : Object.values(tree).reduce((sum, v) => sum + words(v), 0);
}

const BUDGETS: Record<string, number> = {
  // What a first visit reads. One screen of essentials and a few lines more.
  Home: 240,
  // A form: every line is something someone must read to proceed.
  NewReport: 380,
  // The result, around the values themselves.
  Report: 350,
  // Explains a choice; reference rather than landing.
  People: 400,
  Platform: 700,
  Security: 480,
};

describe("copy budget", () => {
  it.each(Object.entries(BUDGETS))("%s stays within %i words", (namespace, budget) => {
    expect(words((en as Tree)[namespace]!)).toBeLessThanOrEqual(budget);
  });
});
