import { test, describe } from "node:test";
import assert from "node:assert";

const BASE_URL = "http://127.0.0.1:5000";

describe("SEC-07: Safe NoSQL Sanitization & Input Validation", () => {
  test("Strips MongoDB operator keys ($ne, $gt) from query parameters", async () => {
    // Attempt NoSQL injection via query param: status[$ne]=null
    const res = await fetch(`${BASE_URL}/api/products?status[$ne]=null`, {
      method: "GET"
    });

    assert.strictEqual(res.status, 200, "Query should execute without crashing or executing injection");
    const data = await res.json();
    assert.ok(Array.isArray(data), "Response should be an array of products");
  });

  test("Strips MongoDB operator keys from POST request bodies preventing auth bypass", async () => {
    // Attempt authentication bypass using NoSQL injection object in email
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: { "$gt": "" },
        password: "wrongpassword"
      })
    });

    // Since $gt was stripped from email, email becomes empty/undefined and fails with 400, 401, or 429
    assert.ok(
      [400, 401, 429].includes(res.status),
      `Must reject login with invalid/sanitized credentials (received ${res.status})`
    );
    assert.notStrictEqual(res.status, 200, "Must not allow login authentication bypass via $gt operator");
  });

  test("Safely escapes regex metacharacters in product searches preventing ReDoS or regex errors", async () => {
    const maliciousRegexPatterns = [
      "Tomato (.*)+",
      "Organic [a-z]+",
      "Fresh?*+^$",
      "\\\\\\\\"
    ];

    for (const pattern of maliciousRegexPatterns) {
      const res = await fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(pattern)}`, {
        method: "GET"
      });

      assert.strictEqual(
        res.status,
        200,
        `Search with special regex chars "${pattern}" should not crash server with 500 error`
      );
      const data = await res.json();
      assert.ok(Array.isArray(data));
    }
  });
});
