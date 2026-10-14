# Roadmap

Where Diplodoctor is going, in the order it is going there. Diplodoctor is the
health layer of the fleet: an agent that does the work on a sealed health file,
a person who decides what leaves it, and licensed clinicians where the law
reserves the work for them. It is built the way Causius is built and on the same
packages. Nothing below is dated on purpose, and nothing is described as built
unless it is. Why this order: `docs/competition/chatgpt-health.md`.

## Now

### Read a lab report and say what it means {#read}

A report in, a health file out, without an account.

- [ ] Intake by photo or PDF of a lab report, several pages in order
- [ ] Every value extracted: name, value, unit, reference range, flag, and the line it was read from
- [ ] A plain-language explanation of each flagged value, as information, not a diagnosis
- [ ] Questions to ask your doctor about this report
- [ ] Files kept in the browser, with export and import
- [ ] The interface and the explanation in German, French, Italian and English
- [ ] A set of real reports with known values, to measure how often extraction is right

### Private by construction {#privacy}

- [ ] Names, insurance numbers and dates of birth replaced in the browser before a report is sent (Causius `redact`)
- [ ] Details covered on page photos before they are sent
- [ ] Your own model: connect a key, checked, kept in the browser
- [ ] A strict content security policy and security headers

### A legal opinion on the medical-device line {#mdr}

- [ ] Written opinion on whether the explanation step is a medical device under the MepV, before it is public

## Next

### Health matters worked by an agent {#matters}

- [ ] Sign in with OrangeCat; one account across the fleet; pseudonymous by default
- [ ] Matters stored on our host in Switzerland, each sealed with its own key
- [ ] A timeline of results, visits and documents; medications with dose and frequency; family history
- [ ] Trends that name the observations they come from, and say when the data is too thin
- [ ] Reminders: a retest, a refill, a follow-up
- [ ] Drafts proposed for the owner to approve: an appointment request, a letter to the Krankenkasse
- [ ] Caring for someone else, with their consent recorded and revocable

### A clinician in the loop {#clinicians}

- [ ] The rules: what the AI may say, what only a licensed doctor may, and who may be pseudonymous
- [ ] "Have a doctor look at it": a redacted file handed to a doctor admitted in Switzerland, who signs the answer
- [ ] Doctors offer the review as an OrangeCat service and are paid there
- [ ] Vitareba as the first clinic

## Later

- [ ] The EPD (elektronisches Patientendossier)
- [ ] Android Health Connect, Apple Health export, Garmin, Withings, Oura when a matter needs them
- [ ] Home diagnostics, ordered and read through a clinician
- [ ] Who may review, and how a complaint is settled, decided in Solon
