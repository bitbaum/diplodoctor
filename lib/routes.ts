/**
 * Every internal href, once. Fleet nav contract rule 6: an internal link that
 * is typed out in a component is a link nobody finds when the route moves.
 */
export const ROUTES = {
  home: "/",
  reports: "/reports",
  newReport: "/reports/new",
  sampleReport: "/reports/sample",
  reportById: (id: string) => `/reports/${id}`,
  clinicians: "/clinicians",
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
