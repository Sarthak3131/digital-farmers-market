import { test, describe } from "node:test";
import assert from "node:assert";

const BASE_URL = "http://127.0.0.1:5000";

describe("SEC-06: Environment-Based Explicit CORS Configuration", () => {
  test("Allowed origin receives proper Access-Control-Allow-Origin and Credentials headers", async () => {
    const res = await fetch(`${BASE_URL}/api/health`, {
      method: "GET",
      headers: {
        Origin: "http://localhost:5173"
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.strictEqual(res.headers.get("access-control-allow-credentials"), "true");
  });

  test("Disallowed external origin is blocked by CORS policy", async () => {
    const res = await fetch(`${BASE_URL}/api/health`, {
      method: "GET",
      headers: {
        Origin: "http://evil-spoofing-site.com"
      }
    });

    // When CORS rejects, Express error middleware catches the CORS error or omits allow header
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assert.notStrictEqual(allowOrigin, "http://evil-spoofing-site.com");
    assert.notStrictEqual(allowOrigin, "*");
  });

  test("Direct server-to-server request without Origin header succeeds cleanly", async () => {
    const res = await fetch(`${BASE_URL}/api/health`, {
      method: "GET"
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "healthy");
  });
});
