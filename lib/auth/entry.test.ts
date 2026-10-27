import { describe, it, expect, vi } from "vitest";
import { accountDestination } from "./entry";

// Keep this adapter test independent of Next's request-bound router module.
// The browser journey verifies the actual locale-aware navigation end to end.
vi.mock("@/i18n/navigation", () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) => `/${locale}${href}`,
  redirect: vi.fn(),
}));

describe("account return routes", () => {
  it("localizes unprefixed paths once and preserves localized callback queries", () => {
    expect(accountDestination("de", "/account")).toBe("/de/account");
    expect(accountDestination("de", "/de/account?section=security#methods")).toBe(
      "/de/account?section=security#methods",
    );
    expect(accountDestination("fr", "/it/account")).toBe("/it/account");
  });
  it("rejects external destinations and sign-in loops", () => {
    const fallback = accountDestination("de");
    for (const next of [
      "https://attacker.example",
      "//attacker.example",
      "/\\attacker.example",
      "/sign-in",
      "/de/sign-in?next=/account",
      "/fr/sign-up",
    ]) {
      expect(accountDestination("de", next)).toBe(fallback);
    }
  });
});
