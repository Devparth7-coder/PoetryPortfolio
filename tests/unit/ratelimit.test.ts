import { describe, it, expect } from "vitest";
import { rateLimit } from "@/infrastructure/ratelimit/limiter";
describe("rate limiter", () => { it("blocks after N hits in window", () => { const k = "t:" + Math.random(); for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 60000).ok).toBe(true); const r = rateLimit(k, 3, 60000); expect(r.ok).toBe(false); expect(r.retryAfterMs).toBeGreaterThan(0); }); });
