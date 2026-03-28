import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isConflictStatus, isRecoverableStatus } from "../inviteRpc.ts";

describe("inviteRpc helpers", () => {
  it("detects conflict status", () => {
    assert.equal(isConflictStatus("conflict"), true);
    assert.equal(isConflictStatus("completed"), false);
  });

  it("detects recoverable status", () => {
    assert.equal(isRecoverableStatus("needs_assignment"), true);
    assert.equal(isRecoverableStatus("completed"), false);
  });
});
