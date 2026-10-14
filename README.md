# Diplodoctor

The health layer of the fleet: an agent that reads a medical report with you, a
person who decides what leaves it, and the people they choose to help: assistants
anyone can be, and licensed professionals where the law reserves the work for them. Paste or photograph a lab report and see every value, which
ones are outside their printed range, what they measure and what to ask your
doctor. Read it without an account, in five languages. An account is there for
what comes next (people you choose, matters), not for the reading.

Served at [diplodoctor.orangecat.ch](https://diplodoctor.orangecat.ch). Beta:
running, not released. Why it looks the way it does, and what it does that
ChatGPT's Health app does not: [`docs/competition/chatgpt-health.md`](docs/competition/chatgpt-health.md).

## Three kinds of help

|                                                                       | Does                                                                                                                      | Does not                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Any AI model**                                                      | Reads, lists every value, flags what is outside its range, explains what it measures, drafts questions for an appointment | Diagnose, prescribe, advise on a medicine, or say a result is nothing to worry about                 |
| **A health assistant** (a name or a pseudonym)                        | Explains, translates, helps prepare an appointment, gives their experience and view, for a price they set                 | Give medical advice with a clinician's standing; what they say is an opinion, and is labelled as one |
| **A licensed professional** (verified licence; a name or a pseudonym) | Advises on what a result means for you, diagnoses and treats within their licence                                         | Work outside the places they are licensed                                                            |

There is no "Diplodoctor model": the AI is whichever model answers, from the fleet's
shared free chain or the reader's own key, and nothing is tied to one vendor.

The first line is software. The last two are people, and the difference between them is
not a ranking: it is who is allowed to say what, and who vouches for them. An assistant
may or may not hold a health qualification, and how helpful people found them is shown
on their profile, so the person asking makes their own decision. A licence is what the
law requires for medical advice where the patient is, and with a **zero-knowledge proof**
a professional can show it is valid without showing who they are (planned). The line
between giving medical advice and giving a view is set by law in almost every country,
and it is the one rule of the product that is not ours to relax. Nobody is listed yet,
and the pages say so.

## Where it sits

Diplodoctor is one product on three planes, like everything else in the fleet
(`bitbaum/fleet` `AGENTS.md` is the authority; this is only how it shows up here):

- **Loki** builds and ships it, and holds its identity. Problem, solution,
  mission and vision live in the Loki project profile; the site renders them
  from the fleet map (`lib/fleet.ts`) and does not author them. `ROADMAP.md`
  and `CHANGELOG.md` are the public record: Loki ingests them and `/roadmap`
  and `/changelog` read the map back through `bip-kit`.
- **OrangeCat** is its economy and, later, its identity. Assistants and licensed
  professionals will offer their work as OrangeCat services and be paid there, in any
  currency.
- **Solon** is its governance: who is admitted as a licensed professional, how helpfulness
  is evaluated and how a dispute is settled are decisions to be taken there.

It is built the way [Causius](https://github.com/bitbaum/causius) is built, on
the same packages, for people and later for clinics and practices.

## Stack

The blessed column of fleet `STACK.md`, nothing else:

| Job                   | Here                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------- |
| AI                    | `@bitbaum/ai-kit` `complete()` over the shared free chain; no vendor SDK, no pinned model id |
| A reader's own model  | `ai-kit/byok` + `ai-kit/byok-probe`, key kept in the browser only                            |
| Validation            | `zod` (the report, every request body, the fleet map entry)                                  |
| Rate limiting         | `limitkit`                                                                                   |
| Accounts              | `better-auth` on Drizzle + Postgres, owned by this app (fleet STACK rule; not a package)     |
| Mail                  | `@bitbaum/mail-kit`, for sign-in links, when a key is set                                    |
| A list                | `listkit` (filters, order, pages, in the address) + `@bitbaum/searchkit` (typo-tolerant)     |
| Dates                 | `@bitbaum/whenkit` (nobody types a date)                                                     |
| Chat                  | `@bitbaum/chatkit` for Ask                                                                   |
| Roadmap and changelog | `bip-kit`, from the fleet map                                                                |
| i18n                  | `next-intl`: English, German, French, Italian, Spanish                                       |
| Design                | `@bitbaum/design-tokens` (tokens.css + the Tailwind preset via `@config`)                    |
| Tests                 | Vitest, hermetic                                                                             |
| Deploy                | PR, CI, auto-merge, deploy to the box, Live check                                            |

### Fleet packages not used, and why

`accountkit` (its sign-in is next-auth; accounts here are better-auth, per STACK), `paykit` and
`threadkit` (they belong to paying and messaging people who help, which does not exist yet),
`geo-kit`, `speechkit` (it measures how someone speaks, not what they say), `sitekit` (this is an
app, not a generated site), `ai-forms` (the add forms have three fields; a form assistant would be
more to read than the form). Header and footer are not packages by design: each product owns its
navigation, checked against the fleet's navigation contract.

## What exists today

- `/today` what is next, the latest results and your medicines; `/records` everything in the file in one
  searchable, filterable list; `/records/add` add a medicine, an appointment or a note
- `/ask` questions about your own file, answered from it, names hidden first
- `/account` your account; one switch keeps your file in it, sealed, so it follows you to any device

- `/` what Diplodoctor is; `/platform` how it is built and why; `/security` what
  protects a report; `/ecosystem` the fleet, read from the fleet map
- `/reports/new` intake: paste a report or photograph up to four pages, pick translation languages
- `/reports/[id]` the report: every value with unit, printed range, flag and the line it came
  from; trends against earlier reports in this browser; questions for your doctor; terms
  explained; follow-ups the document asks for; the document in each language; export
- `/reports` redirects to `/records`, which also imports an exported file
- `/reports/sample` a worked example with invented personal details
- `/people` the three kinds of help, the rules for assistants and licensed professionals, and what a clinic would get
- `/settings` your own model
- `/roadmap`, `/changelog` the public record
- `POST /api/analyze` report in, health file out
- `POST /api/model/check` does this key work, and which models can it use
- `GET /api/health` is the site up, and can it read text and photos without a reader's key

Every page exists in English (`/en/…`), German (`/de/…`), French (`/fr/…`),
Italian (`/it/…`) and Spanish (`/es/…`); `/` opens in the browser's language. A
reading is written in the reader's language.

## What does not exist yet

Said plainly, because the pages say it too. `ROADMAP.md` has the order.

- **Nobody is listed.** Nothing pulls in OrangeCat services, labels them, shows how helpful
  people were or checks a licence. Proving a licence with a zero-knowledge proof is planned.
  "Have a person look at it" is planned.
- **Accounts are optional, and your file stays on your device unless you say
  otherwise.** You can sign in (email and password, a link, a passkey,
  two-factor, OrangeCat or the shared sign-in); reading a report needs none. One
  switch in Account keeps your file on our server too, sealed, so it follows you
  across devices. Until keys only you hold exist, we could technically read it,
  and the switch says so. Your own model key stays in the browser, never on the
  server. Reminders and the EPD are on the roadmap.
- **Photos are not anonymised automatically.** The reader covers details by hand.
- **PDFs are not read** yet; paste the text or photograph the pages.
- **No independent security review** and **no legal opinion on the medical-device
  question** (Swiss MepV) yet. The second is a gate before the explanation step is promoted.

## How a reading is made

`lib/analyze.ts` asks a model for ONE JSON object and `lib/report.ts` decides what to
trust in it:

- `computeFlag` compares each value with the printed bounds. The model's flag is used
  only where there is no numeric range to compare with, and a value is called
  `critical` only if the report itself says so.
- `attentionFloor` makes the urgency at least what the flags imply; the model may ask
  for more care, never less.
- Every value carries the exact line it was read from, shown one tap away.
- `lib/report-trends.ts` follows a value across reports by its English name and unit,
  and never converts a unit.

## Configuration

The free reading runs on whichever of the fleet's shared vendor keys this
deployment has. With none of them, `/api/analyze` answers `503 not_configured`
and the intake page offers your own model or filing by hand.

| Variable                                               | Effect                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | The shared free chain. Any one switches free reading on. A photo needs Gemini or OpenRouter: Groq's free models cannot read images. |
| `DIPLODOCTOR_MODEL`                                    | Optional. Start the chain at this model instead of the front.                                                                       |
| `DIPLODOCTOR_GROQ_MODELS` and the like                 | Optional per-vendor overrides, read by ai-kit's `freeChain("DIPLODOCTOR")`.                                                         |

Limits (per hour, in memory): 8 free readings per visitor, 60 on your own key.

After setting a key on the host, check it end to end:

```sh
curl -s https://diplodoctor.orangecat.ch/api/health   # {"ok":true,"analysis":{"text":true,"photo":…}}
pnpm run check:analyze                                # the sample report through a real model, in all five languages
```

`check:analyze` asserts that exactly the four values outside their range are flagged,
that nothing is called critical, and prints the rest to read. It is not part of CI: it
needs a key and the network.

## Privacy and security

A medical record is "besonders schützenswert" under Swiss data-protection law, so both
are designed in rather than added:

- **Anonymised before it leaves the browser.** `lib/redact.ts` replaces names, addresses,
  AHV and IBAN numbers, phone numbers, e-mail addresses, dates of birth, and labelled
  patient, order, sample and insurance numbers with placeholders (`[NAME-1]`). The reader
  sees each replacement, can add their own words and preview the exact text sent. The
  model answers with the placeholders and the browser restores the real values. Photos are
  covered by hand in `components/PhotoRedactor.tsx`; the boxes are burnt into the pixels
  before upload.
- **Nothing stored on the server.** A report goes to the model provider and the answer comes
  back; only which model served it is logged. Reports, the placeholder table and a reader's
  own API key live in the browser.
- **Anonymised hand-over.** "Export anonymised" writes the report with every personal
  detail replaced and without the placeholder table.
- **Headers** (`lib/security.ts`, `proxy.ts`): a per-request nonce CSP with `strict-dynamic`,
  `connect-src 'self'` and `frame-ancestors 'none'`; HSTS for two years; `nosniff`;
  `Referrer-Policy: no-referrer`; a Permissions-Policy that turns off camera, location and
  payment; same-origin opener and resource policies; `no-store` on every API response.
- **Abuse limits** per visitor (`lib/limits.ts`), and strict validation of every request
  body and imported file (zod).

This repository is public: **no real person's report, name, birth date or number belongs
in it**, including in tests and the sample.

## Design

The look of this product is **one file: `app/theme.css`**. Colour, typefaces, corner radius,
whether a headline is a serif in sentence case or a sans in capitals, and whether a button
shouts or speaks are all values there, read by `@bitbaum/design-tokens` and by the few
shapes in `app/globals.css`. No component sets a colour, a face or a radius of its own. So:

- "make it red and white" is the accent (`--public-accent`) and its dark twin;
- "more gothic" is `--theme-headline-font`, `--theme-headline-case` and the radii;
- another typeface is `--font-display` / `--font-sans`;
- light or dark is the reader's choice, defaulting to their device's.

`lib/theme.test.ts` reads `theme.css` and fails if a change makes text unreadable (WCAG AA,
4.5:1) in either mode, so a look can be tried freely. `lib/copy-budget.test.ts` holds each page to a
word budget (Home is about 230 words): to add copy, cut copy.

It deliberately differs from OrangeCat, Loki and Solon, which are black with one orange
accent: this is for someone holding a result they may be afraid of, so it is light, calm and
rounded by default: warm paper and a deep pine green, not the clinical blue every hospital uses,
with amber and red kept clear for flagging a value. The structure, the tokens and the primitives
are the same, so the products still sit together. What a capability page says is real is decided in one file,
`lib/capabilities.ts`; pages name capabilities and never state a status.

## Development

```sh
pnpm install
pnpm dev
pnpm run verify          # type-check, lint and tests; CI also builds
pnpm run check:analyze   # needs a vendor key: the sample report through a real model
```

Merging to `main` deploys: CI must pass, then the shared deploy workflow builds on the box,
health-checks and rolls back on failure. After every deploy, `live-check.yml` asks the live
site from outside whether every language answers, the security headers are on and reading
is switched on.
