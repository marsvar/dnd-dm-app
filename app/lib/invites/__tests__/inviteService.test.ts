import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedRedirectOrigins,
  isInviteExpired,
  resolveMembershipConflict,
  validateRedirectTarget,
} from "../inviteService.ts";

describe("resolveMembershipConflict", () => {
  it("returns insert when no existing role", () => {
    assert.equal(resolveMembershipConflict(null, "player"), "insert");
  });

  it("returns noop when roles match", () => {
    assert.equal(resolveMembershipConflict("player", "player"), "noop");
  });

  it("returns conflict when roles differ", () => {
    assert.equal(resolveMembershipConflict("player", "dm"), "conflict");
  });
});

describe("isInviteExpired", () => {
  it("returns true for invalid dates", () => {
    assert.equal(isInviteExpired("not-a-date"), true);
  });

  it("returns false for future expiry", () => {
    const now = new Date("2026-03-23T12:00:00.000Z");
    const future = new Date("2026-03-23T12:05:00.000Z");
    assert.equal(isInviteExpired(future, now), false);
  });

  it("returns true for past expiry", () => {
    const now = new Date("2026-03-23T12:00:00.000Z");
    const past = new Date("2026-03-23T11:59:00.000Z");
    assert.equal(isInviteExpired(past, now), true);
  });
});

describe("validateRedirectTarget", () => {
  it("accepts relative redirects", () => {
    const res = validateRedirectTarget("/player", []);
    assert.deepEqual(res, { ok: true, redirectTo: "/player" });
  });

  it("rejects disallowed absolute redirects", () => {
    const res = validateRedirectTarget("https://evil.com", ["https://example.com"]);
    assert.equal(res.ok, false);
  });

  it("accepts allowed absolute redirects and normalizes", () => {
    const res = validateRedirectTarget("https://app.example.com/invite?x=1", [
      "https://app.example.com",
    ]);
    assert.deepEqual(res, { ok: true, redirectTo: "/invite?x=1" });
  });
});

describe("getAllowedRedirectOrigins", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns normalized origins from env", () => {
    process.env.NEXTAUTH_URL = "https://app.example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://site.example.com";
    const origins = getAllowedRedirectOrigins();
    assert.deepEqual(origins, ["https://app.example.com", "https://site.example.com"]);
  });

  it("filters invalid entries", () => {
    process.env.NEXTAUTH_URL = "not-a-url";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const origins = getAllowedRedirectOrigins();
    assert.deepEqual(origins, []);
  });

});
