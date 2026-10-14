/**
 * The plus and the word. A plus is what a first-aid cross is made of and what a
 * lab report prints next to a value that is high; set in the shared display
 * face and the one accent the fleet shares, with the word in the sans like
 * every fleet wordmark (Solon's, Loki's, Causius's).
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`font-display leading-none text-accent ${size === "sm" ? "text-2xl" : "text-3xl"}`}
      >
        +
      </span>
      <span
        className={`font-bold uppercase tracking-caps text-fg-primary ${size === "sm" ? "text-sm" : "text-base"}`}
      >
        Diplodoctor
      </span>
    </span>
  );
}
