import test from "node:test";
import assert from "node:assert/strict";
import { checkAdminAuthorization } from "../admin-auth.js";

test("analytics authorization is closed when unconfigured", async () => {
  const request = new Request("https://example.com/api/analytics");
  assert.equal(await checkAdminAuthorization(request, {}), "unconfigured");
});

test("analytics authorization accepts only the configured bearer token", async () => {
  const env = { ANALYTICS_ADMIN_TOKEN: "correct-horse-battery-staple" };
  const accepted = new Request("https://example.com/api/analytics", {
    headers: { Authorization: "Bearer correct-horse-battery-staple" }
  });
  const rejected = new Request("https://example.com/api/analytics", {
    headers: { Authorization: "Bearer wrong-token" }
  });
  assert.equal(await checkAdminAuthorization(accepted, env), "authorized");
  assert.equal(await checkAdminAuthorization(rejected, env), "unauthorized");
});
