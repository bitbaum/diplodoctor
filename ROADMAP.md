# Roadmap

Where Diplodoctor is going, in the order it is going there. Diplodoctor is the
health layer of the fleet: an agent that does the work on a sealed health file,
a person who decides what leaves it, and the people they choose to help: assistants
anyone can be, and licensed professionals where the law reserves the work for them. It is built the way Causius is built, on the same
packages, for people (B2C) and for clinics and practices (B2B). Nothing below
is dated on purpose, and nothing is described as built unless it is. Why this
order: `docs/competition/chatgpt-health.md`.

## Now

### Read a lab report and say what it means {#read}

A report in, a health file out, without an account.

- [x] Intake by pasted text or a photo of the report, several pages in order {#intake}
- [x] Every value extracted: name, value, unit, printed range, flag, and the line it was read from {#values}
- [x] The flag decided by comparing the numbers, not by the model; urgency never lower than the flags imply {#flags}
- [x] Plain-language information on each value outside its range, as information and never a diagnosis {#explain}
- [x] Questions to ask your doctor, written from the values outside their range {#questions}
- [x] Reports kept in the browser, with export and import {#export}
- [x] A value followed across reports in this browser, with units never converted {#trends}
- [x] The interface and the reading in German, French, Italian, English and Spanish {#languages}
- [x] Analysis through the fleet's shared model chain, with a rate limit; or your own model {#models}
- [x] Shared model keys set on the host, and the first real report read there
- [ ] A set of real reports with known values, to measure how often extraction is right
- [ ] Reports that arrive as a PDF

### Private by construction {#privacy}

- [x] Names, birth dates, addresses, insurance, patient and order numbers replaced in the browser before a report is sent {#anonymise}
- [x] Details covered on page photos before they are sent {#anonymise-photos}
- [x] An anonymised file to hand to a person you choose {#anonymise-export}
- [ ] Zero-knowledge proofs wherever an identity would otherwise be exposed, starting with a licence {#zk}
- [x] A strict content security policy and security headers {#security}
- [ ] Read the text of a photographed page in the browser, so photos are anonymised automatically too
- [ ] Model providers that contractually do not train on or retain what they are sent
- [ ] An independent security review before the first real users

### A legal opinion on the medical-device line {#mdr}

Software that interprets one person's values may be a medical device under the
Swiss MepV (which follows the EU MDR). "Information, not diagnosis", with
medical advice left to people licensed where the patient is, is the design that
keeps it clear of that; it needs a real opinion before the explanation step is promoted.

- [ ] A written opinion on whether the explanation step is a medical device, before it is promoted

### A look of its own {#look}

- [x] A light, calm theme, dark on request, the whole look in one file {#theme}
- [x] A test that keeps any theme readable (WCAG AA) {#theme-test}

### Say what Diplodoctor is, in one place {#identity}

Problem, solution, mission and vision live in the Loki project profile and are
rendered here, never written twice.

- [x] Roadmap and changelog kept in this repository and rendered from the fleet map {#records}
- [ ] Problem, solution, mission and vision filled in on the Loki profile
- [ ] An OrangeCat profile, so the project can be found and funded
- [ ] A Solon organisation, so its rules can be decided in the open

## Next

### Health matters worked by an agent {#matters}

A health matter is any concern to be handled. The agent keeps the timeline,
drafts, and proposes anything outward for the owner to approve.

- [x] Accounts of our own, optional, pseudonymous by default: email and password, link, passkey, two-factor, OrangeCat and the shared sign-in
- [ ] One account across the fleet without a second sign-up
- [ ] Matters stored on our host in Switzerland, each sealed with its own key
- [ ] A timeline of results, visits and documents; medications with dose and frequency; family history
- [ ] Reminders: a retest, a refill, a follow-up
- [ ] Drafts proposed for the owner to approve: an appointment request, a letter to the Krankenkasse
- [ ] A dispute with an insurer handed to Causius
- [ ] Caring for someone else, with their consent recorded and revocable
- [ ] Bring a quick-check report into a matter in one step

### People in the loop {#people}

Three kinds of help, labelled for what each is: any AI model, a health assistant
(anyone, under a name or a pseudonym, evaluated by the people they helped) and a
licensed professional (a verified licence, which may be proven without revealing who
holds it).

- [x] The rules: what an AI model may say, what an assistant's view is, what only a licensed professional may give, and who may be pseudonymous {#people-rules}
- [ ] "Have a person look at it": a redacted file handed to an assistant or a licensed professional you choose
- [ ] Assistants and licensed professionals offer their work as OrangeCat services and are paid there, in any currency
- [ ] How helpful people found an assistant, shown on their profile, from the people they helped
- [ ] A licence proven with a zero-knowledge proof against the public register, so a licensed professional can stay pseudonymous
- [ ] Admission, labelling and evaluation rules adopted by a recorded vote on Solon

### For clinics and practices {#clinics}

- [ ] A patient hands a clinic their file by choice, anonymised until they decide otherwise
- [ ] A clinic's patients arrive with their results read and their questions written
- [ ] A clinic runs Diplodoctor on a model inside its own walls, so patient data never leaves the practice
- [ ] A clinic's own branding and languages on its own address

## Later

- [ ] The EPD (elektronisches Patientendossier)
- [ ] Android Health Connect, Apple Health export, Garmin, Withings, Oura, when a matter needs them
- [ ] Home diagnostics, ordered and read through a licensed professional
- [ ] Keys only the owner holds, so the operator cannot open a matter
- [ ] More languages where there are readers; the five already shipped are the Swiss three, English and Spanish
- [ ] Look: more themes beside the first, one file each
