import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const take = (audio: Blob | null) => {
  const body = new FormData();
  if (audio) body.append("audio", audio, "voice.webm");
  body.append("locale", "de");
  return new Request("http://localhost/api/transcribe", { method: "POST", body });
};

describe("POST /api/transcribe", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("says it is not configured when there is no speech key, never a bare 500", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const res = await POST(take(new Blob(["x"], { type: "audio/webm" })));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_configured" });
  });

  it("refuses a request with no audio", async () => {
    vi.stubEnv("GROQ_API_KEY", "test");
    const res = await POST(take(null));
    expect(res.status).toBe(400);
  });

  it("refuses a take larger than chatkit's two-minute cap could make", async () => {
    vi.stubEnv("GROQ_API_KEY", "test");
    const res = await POST(take(new Blob([new Uint8Array(9 * 1024 * 1024)])));
    expect(res.status).toBe(413);
  });
});
