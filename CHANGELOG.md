# Changelog

What changed for the people who use Diplodoctor, newest first. Every entry
comes from a change merged into this repository; where there is a number in
brackets, it is the pull request to read for the detail.

## 2026-10-15

### Changed

- **Much less to read.** The home page went from about a thousand words to a
  couple of hundred: what it is, one value read, how it works, why it is
  private, and who can help. The depth moved to Platform and Security; the
  intake form, the report page and People were cut by a quarter to a third. A
  test now holds each page to a word budget. {#less-text}
- **Warm paper and pine green, not clinical blue.** Blue is every hospital's
  colour. The look is one file (`app/theme.css`), so it stays a one-line change.
  {#colour}
- **Every control in the header and footer is at least 44px**, at phone, tablet
  and desktop width, in all five languages. {#targets}

## 2026-10-14 (later)

### Changed

- **Three kinds of help, said honestly.** Any AI model (there is no "Diplodoctor
  model"; it is whichever model answers), a health assistant anyone can be, under
  a name or a pseudonym, whose view is an opinion and whose helpfulness will be
  shown, and a licensed professional, whose licence can be proven without
  revealing who they are. `/clinicians` is now `/people`. Nobody is listed yet and
  the pages say so; the zero-knowledge licence proof is planned. {#people}
- **A look of its own.** Light and calm by default, dark on request or when your
  device asks, with a toggle in the header. The whole look is one file,
  `app/theme.css`, and a test keeps any change readable. {#theme}

## 2026-10-14

### Added

- **Read a lab report.** Paste it or photograph its pages, in any language. Every
  value comes out with its unit, its printed range and the line of the report
  it was read from. {#read}
- **The numbers decide, not the model.** Whether a value is outside its range is
  worked out by comparing it with the printed bounds, and the urgency shown can
  never be lower than the values imply. {#flags}
- **What it means, as information.** A plain explanation for each value outside
  its range, questions to take to your doctor, and the words of a non-lab
  document explained. Never a diagnosis. {#explain}
- **Follow a value over time.** When the same measurement is in an earlier report
  in this browser, the earlier value and the direction are shown. Units are
  never converted. {#trends}
- **Private by construction.** Names, birth dates, addresses, insurance, patient
  and order numbers are replaced in your browser before anything is sent;
  reports live in this browser only; an anonymised file can be exported for a
  clinician. {#privacy}
- **Five languages.** The whole site and every reading in English, German,
  French, Italian and Spanish. {#languages}
- **Your own model.** Connect an API key and the reading runs on your own
  budget; the key stays in your browser. {#own-model}
- **Roadmap, changelog and the rules for clinicians**, said plainly, with
  nobody listed who does not exist. {#records}
