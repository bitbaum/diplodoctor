/**
 * What this product is called and where it lives — written once, when the
 * product was created from bitbaum/fleet templates/app, and nowhere else.
 *
 * Problem, solution, mission, vision, roadmap and changelog are NOT here: they
 * have one producer, the Loki project profile (fleet AGENTS.md, "The identity
 * contract"), and the roadmap and changelog pages render it.
 */
export const SITE = {
  slug: "diplodoctor",
  title: "Diplodoctor",
  /** The public origin. The box env may override it (NEXT_PUBLIC_APP_URL). */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://diplodoctor.orangecat.ch",
  repo: "https://github.com/bitbaum/diplodoctor",
} as const;
