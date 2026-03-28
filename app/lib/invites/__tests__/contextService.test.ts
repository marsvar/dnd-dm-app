import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canExtendTtl, isExpired } from "../contextService.ts";

describe("contextService", () => {
  describe("isExpired", () => {
    it("returns true for invalid dates", () => {
      assert.equal(isExpired("nope"), true);
    });

    it("returns false for future expiry", () => {
      const now = new Date("2026-03-27T00:00:00.000Z");
      const future = new Date("2026-03-27T00:10:00.000Z");
      assert.equal(isExpired(future, now), false);
    });

    it("returns true for past expiry", () => {
      const now = new Date("2026-03-27T00:00:00.000Z");
      const past = new Date("2026-03-26T23:59:00.000Z");
      assert.equal(isExpired(past, now), true);
    });
  });

  describe("canExtendTtl", () => {
    it("returns false when last seen is too old", () => {
      assert.equal(
        canExtendTtl("2026-03-27T00:00:00.000Z", new Date("2026-03-27T03:00:00.000Z")),
        false
      );
    });

    it("returns true when within ttl window", () => {
      assert.equal(
        canExtendTtl("2026-03-27T00:00:00.000Z", new Date("2026-03-27T00:10:00.000Z")),
        true
      );
    });
  });
});
