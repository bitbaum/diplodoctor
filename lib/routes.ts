/**
 * Every internal href, once. Fleet nav contract rule 6: an internal link that
 * is typed out in a component is a link nobody finds when the route moves.
 */
export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  account: "/account",
  today: "/today",
  records: "/records",
  addRecord: "/records/add",
  ask: "/ask",
  newReport: "/reports/new",
  sampleReport: "/reports/sample",
  reportById: (id: string) => `/reports/${id}`,
  people: "/people",
  settings: "/settings",
  ownModel: "/settings#ai",
  platform: "/platform",
  security: "/security",
  ecosystem: "/ecosystem",
  roadmap: "/roadmap",
  changelog: "/changelog",
} as const;

export const API = {
  analyze: "/api/analyze",
  modelCheck: "/api/model/check",
  health: "/api/health",
  transcribe: "/api/transcribe",
} as const;

/** The three planes this product sits on, and its own repository. */
export const EXTERNAL = {
  repo: "https://github.com/bitbaum/diplodoctor",
  orangecat: "https://orangecat.ch",
  orangecatOfferService: "https://orangecat.ch/dashboard/services/create",
  loki: "https://loki.orangecat.ch",
  solon: "https://solon.orangecat.ch",
  license: "https://github.com/bitbaum/diplodoctor/blob/main/LICENSE",
} as const;

/**
 * Where to go after signing in. Only a path inside this site is accepted, so a
 * crafted `?next=https://evil.example` or `//evil.example` cannot turn the
 * sign-in page into an open redirect.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return ROUTES.account;
  }
  return value;
}
