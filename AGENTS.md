# Agents

Read `bitbaum/fleet` `AGENTS.md` and the registers it names before inventing a
host, a name, or a page. Do not copy those facts into this file.

Repo-only notes live below this line.

- **Finish to production.** An instruction from the owner is done when it is
  live on diplodoctor.orangecat.ch, not when a pull request is open. Open a
  non-draft PR, let CI go green and the fleet's auto-merge sweep
  (`auto-merge.yml`) merge it, watch the Deploy run, and check the live site.
  `live-check.yml` asks the live site from outside after every deploy; a red
  Live check means the product is not working, whatever Deploy said.
- Run: `pnpm install`, `pnpm dev`. Check before pushing: `pnpm run verify`
  (format check, lint, typecheck, tests, build).
- Tests are Vitest, next to the code they test (`lib/*.test.ts`,
  `i18n/parity.test.ts`). They are hermetic. `pnpm run test:integration` drives
  sign-up and sign-in against a throwaway `*_test` Postgres (CI provides one).
  `pnpm run check:analyze` is the one check that calls a real model; it needs a
  vendor key and is not in CI.
- Every string a reader sees lives in `messages/{en,de,fr,it,es}.json`; the
  parity test fails on a missing key or a changed argument. English is the
  source. German uses Swiss spelling (ss, never ß). Link with
  `@/i18n/navigation`, never `next/link`, so a reader on `/de` stays on `/de`.
  Every page is under its language prefix (`localePrefix: "always"`); see
  `i18n/routing.ts` for why the unprefixed default broke Causius in production.
- **A medical record is the most private thing here. Security and privacy are
  not negotiable, whatever else is.** A report leaves the browser only after
  `lib/redact.ts` has anonymised it; nothing about a report is stored or logged
  on the server, except the file a signed-in person chooses to keep there,
  sealed (`lib/health-file.ts`); the CSP in `lib/security.ts` stays nonce-based with
  `connect-src 'self'`. A change that loosens any of these needs a reason
  written next to it.
- **This repository is public and the product handles medical reports.** No
  real person's report, name, birth date, insurance or order number goes into
  the code, the tests, the sample or a commit message. `lib/sample.ts` is
  invented.
- **Information, not diagnosis.** Do not weaken the system prompt's refusal to
  diagnose, advise on a medicine, or reassure. There are three kinds of help (any
  AI model, a health assistant, a licensed professional) and the labels on
  `/people` say what each is allowed to do. An assistant is anyone, evaluated by
  the people they helped, whose view is an opinion; a licensed professional's
  licence is verified and may be proven by a zero-knowledge proof so they can stay
  pseudonymous. Do not blur those labels: who may give medical advice where the
  patient is treated is set by law, not by us. There is no "Diplodoctor model" —
  the AI is whichever model answers; never write copy that implies a proprietary one.
- **The model reads; code decides.** A flag comes from `computeFlag` in
  `lib/report.ts`, and `attention` can never be lower than `attentionFloor`
  implies. Do not move either decision back into the prompt.
- The report (`lib/report.ts`) is the one shape the reading produces, the
  browser stores and Export writes. Change the zod schema, not a copy of it.
- The model call is `@bitbaum/ai-kit`'s `complete()` in `lib/analyze.ts`. Do not
  add a vendor SDK, a hand-rolled fetch to a model, or a pinned model id.
- **The look is `app/theme.css` and nothing else.** Colour, faces, radii, headline
  case and action style are values there; components use semantic tokens only
  (`bg-surface-base`, `text-fg-secondary`, `rounded-surface`, `bg-accent`), never a
  hex, a palette colour or a one-off radius. `lib/theme.test.ts` enforces AA contrast
  in light and dark, so restyling is safe. The owner asked (2026-10-14) that Diplodoctor
  look different from OrangeCat/Loki/Solon (light, calm, not black and orange) and that a
  change like "red and white" or "more gothic" stays a one-file edit; keep it so.
  `globals.css` defines no token of its own. Whether a capability works today is decided
  only in `lib/capabilities.ts`.
- **Words are a cost.** A landing page is a decision to try, not a document: `lib/copy-budget.test.ts`
  holds Home, the intake form, the report page and `/people` to a word budget, and depth lives one
  click away. Before adding a sentence, ask who reads it and what they do next; if nobody does,
  cut it. Use `<details>` for what only some people need.
- **Zero-knowledge proofs are the fleet's ethos, applied here where an identity would
  otherwise be exposed:** proving a licence without revealing who holds it, and later other
  claims. They are planned; no page may say they exist until they do.
- Diplodoctor and Causius (and the accounting product later) approach the same problems the
  same way and are built the same way, so they coexist: same packages, same privacy
  pattern, same three kinds of help. They differ in their theme and their domain.
- Nothing is claimed on a page unless it is true today. No invented clinicians,
  ratings or testimonials.
- `ROADMAP.md` and `CHANGELOG.md` are the public record; Loki's fleet map
  ingests them and the site reads the map back. A user-facing change adds a
  changelog line in the same pull request.
