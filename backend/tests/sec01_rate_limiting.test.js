import { test, describe } from "node:test";
import assert from "node:assert";

const BASE_URL = "http://127.0.0.1:5000";

describe("SEC-01: Rate Limiting Enforcement", () => {
  test("Auth rate limiter responds with standard rate limit headers and triggers HTTP 429 when exceeded", async () => {
    // Send 16 requests to login with dummy credentials
    let lastResponse;
    const statuses = [];

    for (let i = 0; i < 16; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@user.com", password: "wrongpassword" })
      });
      statuses.push(res.status);
      lastResponse = res;
    }

    assert.ok(lastResponse.headers.has("x-ratelimit-limit"), "Must include X-RateLimit-Limit header");
    assert.strictEqual(lastResponse.headers.get("x-ratelimit-limit"), "15");
    assert.ok(lastResponse.headers.has("retry-after"), "Must include Retry-After header on 429");

    const count429 = statuses.filter((s) => s === 429).length;
    assert.ok(count429 >= 1, "Must return HTTP 429 once request count exceeds 15");

    const data = await lastResponse.json();
    assert.match(data.message, /too many.*attempts/i);
  });

  test("Order endpoint includes rate limit headers", async () => {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    // Even if 401 Unauthorized (since no token), the global rate limit headers are set
    assert.ok(res.headers.has("x-ratelimit-limit"), "Must include X-RateLimit-Limit header");
  });
});
