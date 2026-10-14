import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Accounts, end to end, against a real Postgres built from drizzle/ — the
 * check that the schema and better-auth agree, which no unit test can make.
 *
 * DESTRUCTIVE: it drops and recreates the `public` schema of DATABASE_URL, so
 * it refuses to run unless the database name ends in `_test`.
 */
const url = process.env.DATABASE_URL ?? "";
const dbName = url ? new URL(url).pathname.slice(1) : "";
if (!dbName.endsWith("_test")) {
  throw new Error(`refusing to run: DATABASE_URL must name a *_test database (got "${dbName}")`);
}

// Fresh per run: a fixed secret in a test file is still a secret in git.
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");
process.env.SECRET_SEAL_KEY = randomBytes(32).toString("hex");

const { SITE } = await import("@/lib/site");
const route = await import("@/app/api/auth/[...all]/route");
const health = await import("@/app/api/health/route");
const fileRoute = await import("@/app/api/file/route");

let ip = 0;
const nextIp = () => `198.51.100.${++ip}`;

function post(path: string, body: unknown, init: { cookie?: string; ip?: string } = {}) {
  return route.POST(
    new Request(`${SITE.url}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: SITE.url,
        "x-forwarded-for": init.ip ?? nextIp(),
        ...(init.cookie ? { cookie: init.cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

function get(path: string, cookie?: string) {
  return route.GET(
    new Request(`${SITE.url}/api/auth${path}`, {
      headers: { "x-forwarded-for": nextIp(), ...(cookie ? { cookie } : {}) },
    }),
  );
}

/** The session cookie a response set, as a Cookie header. */
function cookieOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

const db = new Client({ connectionString: url });

beforeAll(async () => {
  await db.connect();
  await db.query("drop schema if exists public cascade; create schema public;");
  const dir = join(process.cwd(), "drizzle");
  for (const file of readdirSync(dir)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort()) {
    for (const statement of readFileSync(join(dir, file), "utf8").split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) await db.query(statement);
    }
  }
});

afterAll(async () => {
  await db.end();
});

describe("email and password", () => {
  const email = "person@example.ch";
  const password = "a long enough passphrase";
  let cookie = "";

  it("creates an account without a real name, and signs it in", async () => {
    const response = await post("/sign-up/email", { email, password, name: "" });
    expect(response.status).toBe(200);
    cookie = cookieOf(response);
    expect(cookie).toContain("session_token");
  });

  it("never lets a person choose their own role", async () => {
    const response = await post("/sign-up/email", {
      email: "climber@example.ch",
      password,
      name: "x",
      role: "admin",
    });
    expect(response.status).toBe(200);
    const { rows } = await db.query("select role from users where email = $1", [
      "climber@example.ch",
    ]);
    expect(rows[0]?.role).toBe("customer");
  });

  it("reads the session back, as a customer", async () => {
    const response = await get("/get-session", cookie);
    const session = (await response.json()) as { user: { email: string; role: string } };
    expect(session.user.email).toBe(email);
    expect(session.user.role).toBe("customer");
  });

  it("stores a slow hash, never the password, and no IP address", async () => {
    const { rows } = await db.query(
      "select a.password, s.ip_address from accounts a join sessions s using (user_id) where a.provider_id = 'credential' limit 1",
    );
    expect(rows[0]?.password).toBeTruthy();
    expect(rows[0]?.password).not.toContain(password);
    expect(rows[0]?.ip_address || null).toBeNull();
  });

  it("refuses a wrong password", async () => {
    const response = await post("/sign-in/email", { email, password: "wrong wrong wrong" });
    expect(response.status).toBe(401);
  });

  it("signs in with the right one", async () => {
    const response = await post("/sign-in/email", { email, password });
    expect(response.status).toBe(200);
  });

  it("stops guessing at the tenth attempt from one address, however the client forges its header", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      // A fresh forged first hop every time; the proxy's hop stays the same.
      const forged = `10.0.${i}.1, 203.0.113.50`;
      statuses.push(
        (await post("/sign-in/email", { email, password: "guess guess guess" }, { ip: forged }))
          .status,
      );
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("offers passkey registration to a signed-in person", async () => {
    const response = await get("/passkey/generate-register-options", cookie);
    expect(response.status).toBe(200);
    const options = (await response.json()) as { challenge?: string; rp?: { id: string } };
    expect(options.challenge).toBeTruthy();
    expect(options.rp?.id).toBe(new URL(SITE.url).hostname);
  });

  it("sets up two-factor with the secret encrypted at rest", async () => {
    const response = await post("/two-factor/enable", { password }, { cookie });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { totpURI: string; backupCodes: string[] };
    expect(body.totpURI).toMatch(/^otpauth:\/\/totp\//);
    const secret = new URL(body.totpURI).searchParams.get("secret") ?? "";
    const { rows } = await db.query("select secret from two_factors");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.secret).not.toContain(secret);
  });

  it("keeps a health file sealed, only when asked, and never overwrites a newer one", async () => {
    const call = (method: "GET" | "PUT" | "DELETE", body?: unknown) =>
      fileRoute[method](
        new Request(`${SITE.url}/api/file`, {
          method,
          headers: { cookie, "content-type": "application/json", "x-forwarded-for": nextIp() },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
    const item = (id: string, name: string) => ({
      id,
      createdAt: "2026-10-01T10:00:00Z",
      kind: "medication",
      name,
    });

    // Off until the person turns it on.
    expect(await (await call("GET")).json()).toEqual({ enabled: false });

    const created = await call("PUT", {
      version: 0,
      data: { reports: [], items: [item("i_1", "Metformin")] },
    });
    expect(created.status).toBe(200);
    const { rows } = await db.query("select sealed, version from health_files");
    expect(rows).toHaveLength(1);
    expect(String(rows[0]?.sealed)).not.toContain("Metformin");

    const read = (await (await call("GET")).json()) as {
      enabled: boolean;
      version: number;
      data: { items: { name: string }[] };
    };
    expect(read.enabled).toBe(true);
    expect(read.data.items[0]?.name).toBe("Metformin");

    // A second device that read version 1 saves; the first, still on version 1, is refused.
    const saved = await call("PUT", {
      version: read.version,
      data: { reports: [], items: [item("i_2", "Ramipril")] },
    });
    expect(saved.status).toBe(200);
    const stale = await call("PUT", { version: read.version, data: { reports: [], items: [] } });
    expect(stale.status).toBe(409);
    const current = (await stale.json()) as { current: { data: { items: { name: string }[] } } };
    expect(current.current.data.items[0]?.name).toBe("Ramipril");

    // Junk is dropped, not stored.
    const junk = await call("PUT", {
      version: 2,
      data: { reports: [{ nope: 1 }], items: [{ kind: "x" }, item("i_3", "Aspirin")] },
    });
    expect(junk.status).toBe(200);
    const after = (await (await call("GET")).json()) as {
      data: { reports: unknown[]; items: unknown[] };
    };
    expect(after.data.reports).toHaveLength(0);
    expect(after.data.items).toHaveLength(1);

    // Turning it off removes the copy.
    expect(await (await call("DELETE")).json()).toEqual({ enabled: false });
    expect((await db.query("select 1 from health_files")).rowCount).toBe(0);
  });

  it("refuses the health file without a session", async () => {
    const res = await fileRoute.GET(
      new Request(`${SITE.url}/api/file`, { headers: { "x-forwarded-for": nextIp() } }),
    );
    expect(res.status).toBe(401);
  });

  it("deletes the account and everything hanging off it", async () => {
    const response = await post("/delete-user", { password }, { cookie });
    expect(response.status).toBe(200);
    const { rows } = await db.query("select count(*) as users from users where email = $1", [
      email,
    ]);
    expect(Number(rows[0]?.users)).toBe(0);
  });
});

describe("health", () => {
  it("is green when the app can read its own tables", async () => {
    const response = await health.GET();
    const body = (await response.json()) as { ok: boolean; db: string };
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, db: "up" });
  });
});
