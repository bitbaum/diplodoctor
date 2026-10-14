# ChatGPT Health, read closely

What OpenAI's Health app in ChatGPT is, read from its own app listing and tool
descriptions (version 0.1.6, seen 2026-10-14 on Android, Swiss account, German
interface), and what that leaves open for Diplodoctor.

## What it is

An app inside ChatGPT, built by OpenAI, with the label "Interactive and Read".
It connects two kinds of source and lets the model read them:

| Source | How it arrives | Tools that read it |
| --- | --- | --- |
| **Apple Health** | Synced from an iPhone | `view_all_metrics` (the catalogue), `view_synced_metrics` (what has data, with date ranges), `query_samples_file` (raw samples, e.g. `sleepAnalysis`, `workout`, `heartRate`), `aggregate_timeseries_file` (server-side, de-duplicated totals and buckets), `fetch_characteristics` (static facts) |
| **Medical records** from connected providers | Account connections, synced on request | `list_account_connections`, `sync_account_connection`, `open_medical_resource` (visits, labs, medications, imaging, notes, ECG waveforms), `health_summary` |
| **A health profile** | What the user confirms in chat | `read_health_profile`, `update_health_profile` (conditions and medications against a catalogue) |

There are two write actions, and both write only to the user's own copy: sync
a connection, and update the profile. Nothing goes outward.

## What its own tool descriptions admit

These are OpenAI's words to its own model, and each one is a limit:

- **Apple Health only.** Every wearable tool says so. An Android phone, a
  Garmin, a Withings scale or an Oura ring brings nothing. The screenshots were
  taken on Android, where half of the product is out of reach.
- **Medical records come through provider connections.** At launch those were
  US providers. A Swiss record (EPD, a hospital portal, a lab PDF from
  Viollier, Unilabs or Dr Risch) has no connection to arrive through.
- **"The profile stores membership or currentness, not structured dose /
  frequency or family relationships."** It knows that you take a drug, not how
  much or how often, and it does not know your family history.
- **"Do not save another person's conditions as the user's own."** One person,
  one profile. Caring for a parent or a child is not in the model.
- **"Coverage counts are not trend evidence"**, "check result_status and its
  completeness and row-limit signals". The tools are careful about honesty,
  and so should we be. This is the bar, not a weakness.
- **"Explore your data."** It explains. It does not book, order, remind,
  write to an insurer or put a clinician in front of the answer. No doctor is
  in the loop at any point.
- **Developer: OpenAI.** The data sits with a US model provider, under its
  privacy policy. There is no pseudonymous use and no choice of model.

## Where Diplodoctor is better, not just different

We do not try to out-aggregate Apple and OpenAI on wearables. We win where
their design stops.

1. **A person stands behind the answer, of your choosing.** The AI prepares a
   file; you may hand it to a health assistant (anyone, under a name or a
   pseudonym, whose helpfulness is shown from the people they helped, who might
   be a doctor from another country charging a fraction of a Swiss fee, and
   whose view is an opinion, not medical advice) or to a licensed professional
   (admitted where you are, who signs the answer). Either is paid through
   OrangeCat, in any currency. Diagnosis and prescription are reserved to
   licensed professionals by law, the same line Causius keeps between assistant
   and lawyer. ChatGPT Health has no person in it at all; we are built on the
   choice. A licensed professional can prove their licence with a zero-knowledge
   proof and stay pseudonymous (planned).
1a. **Any model.** There is no Diplodoctor model. The reading runs on whichever
   model answers, from a shared free chain or the reader's own key; ChatGPT
   Health is OpenAI's, on OpenAI's.
2. **Swiss and European records, starting with paper.** Most Swiss patients
   hold their results as PDFs and printouts. Photograph or upload a lab report,
   and every value comes out with its unit, reference range, flag and the line
   of the report it was read from. This is Causius's letter intake, pointed at
   a lab report. The EPD and Android Health Connect follow.
3. **Private by construction.** Names, insurance numbers and dates of birth
   are replaced in the browser before anything reaches a model
   (`causius/lib/redact.ts`). Each record is sealed with its own key
   (`causius/lib/crypto.ts`), on our own host in Switzerland. Health data is
   "besonders schützenswert" under the revDSG; we treat it that way.
   Pseudonymous by default, and a reader may bring their own model.
4. **It does the work.** A health concern is a matter, like in Causius: a
   timeline, medications with dose and frequency, family history, questions
   for the next appointment, a retest reminder in three months, a letter to
   the Krankenkasse (handed to Causius when it is a dispute). Anything that
   leaves the file is proposed and the owner approves it.
5. **Caring for someone else.** A parent's file kept by a daughter, a child's
   by both parents, with the person's consent recorded and revocable.
6. **Every number cites its source.** A trend names the observations it was
   computed from, and says when the data is too thin to be a trend. We take
   OpenAI's honesty rules and make them visible to the reader instead of
   keeping them in a prompt.

## What we do not build

- A wearable aggregation platform. Apple, Google and OpenAI will own that.
  We read the exports and the open APIs when a matter needs them.
- A symptom checker that diagnoses. Before a clinician signs, Diplodoctor
  gives health information, not a diagnosis.

## The risk to decide before building past the first slice

Software that interprets one person's lab values may be a medical device under
the Swiss MepV (which follows the EU MDR; rule 11 puts most such software in
class IIa or higher). "Information, not diagnosis" plus a clinician who signs
is the design that keeps us on the right side of it, but it needs a real legal
opinion before the explanation step ships to the public, not after.
