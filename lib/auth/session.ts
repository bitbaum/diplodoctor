export { getSession } from "./server";
import type { getSession } from "./server";
export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
