/**
 * The day-zero page.
 *
 * Every site this scaffold creates serves THIS until its owner replaces it, so
 * it is not a placeholder — it is the first thing a client sees after being
 * told their site is live, and for some of them it is the only page they will
 * ever see us make. The previous version was a note to the developer
 * ("Replace this page, and change the tokens in app/globals.css"), rendered at
 * the client. It read as unfinished work left on a public URL.
 *
 * What it does instead:
 *   1. PROVES the thing works — the host, live, over TLS, in the first line.
 *   2. Tells the owner what to do next, with one primary action.
 *   3. Sends them to FleetCrown, where they can actually build it, rather than
 *      to us. A site nobody can change without emailing the studio is the
 *      failure mode this whole scaffold exists to avoid.
 *
 * It stays honest about being day zero ("waiting for its first page") so that
 * nobody mistakes it for a finished site — the warning in globals.css about
 * shipping the default palette still holds, and this page states it in public
 * rather than in a comment only a developer reads.
 */
const FLEETCROWN = "https://fleetcrown.orangecat.ch";

// Written by new-site.sh at scaffold time, alongside the widget token. Absent
// when the FleetCrown database was unreachable — provisioning is non-fatal by
// design — so fall back to the project list rather than rendering a dead link
// to /projects/undefined.
const projectId = process.env.NEXT_PUBLIC_FC_PROJECT_ID;
const buildHref = projectId ? `${FLEETCROWN}/projects/${projectId}` : `${FLEETCROWN}/projects`;

const STEPS = [
  {
    n: "01",
    title: "Say what you want",
    body: "Plain words, not a brief. A one-page site for a Zürich clinic, calm, with a booking button.",
  },
  {
    n: "02",
    title: "An agent builds it",
    body: "It writes the code and opens a pull request you can read before anything goes live.",
  },
  {
    n: "03",
    title: "It ships itself",
    body: "Merged changes deploy to this address on their own. No handover, no invoice for a typo.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-shell flex-col px-6 py-12 sm:px-10 sm:py-16">
      {/* Proof before pitch: the host, live, right at the top. */}
      <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-caps text-fg-muted">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-live opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-signal-live" />
        </span>
        <span className="sr-only">Live:</span>
        diplodoctor.orangecat.ch
      </p>

      <div className="flex flex-1 flex-col justify-center py-16 sm:py-24">
        <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-display text-fg-primary sm:text-6xl">
          Diplodoctor
          <span className="block font-normal text-fg-muted">is waiting for its first page.</span>
        </h1>

        <p className="mt-8 max-w-prose text-lg leading-relaxed text-fg-secondary">
          Everything underneath it already runs. A certificate, a repository, tests on every change
          and a deploy that happens on its own. What is missing is the part only you can decide:
          what this should say, and who it should say it to.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href={buildHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-medium text-accent-contrast transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fg"
          >
            Build this site
            <span aria-hidden="true">&rarr;</span>
          </a>
          <p className="text-sm leading-relaxed text-fg-muted">
            Opens this site&rsquo;s project in FleetCrown.
          </p>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-10">
        <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          {STEPS.map((step) => (
            <li key={step.n}>
              <p className="font-mono text-xs uppercase tracking-caps text-accent-fg">{step.n}</p>
              <h2 className="mt-3 font-heading text-base font-semibold text-fg-primary">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 max-w-prose rounded-lg bg-surface-raised px-5 py-4 text-sm leading-relaxed text-fg-secondary">
          You can also change it from here. Point at anything on the page, say what is wrong, and it
          becomes a pull request &mdash; the same one an agent would open.
        </p>

        <p className="mt-10 font-mono text-xs uppercase tracking-caps text-fg-muted">
          Built with{" "}
          <a
            href={FLEETCROWN}
            className="text-fg-secondary underline decoration-border-subtle underline-offset-4 transition-colors hover:decoration-fg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fg"
          >
            FleetCrown
          </a>
        </p>
      </div>
    </main>
  );
}
