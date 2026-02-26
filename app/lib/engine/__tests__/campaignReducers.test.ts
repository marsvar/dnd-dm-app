import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canStartCombat, deleteCampaignFromState } from "../campaignReducers.ts";
import type { AppState, Encounter } from "../../models/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeEncounter = (
  id: string,
  campaignId: string | undefined,
  isRunning: boolean
): Encounter => ({
  id,
  name: `Encounter ${id}`,
  campaignId,
  round: 1,
  isRunning,
  activeParticipantId: null,
  participants: [],
  eventLog: [],
});

const makeState = (overrides: Partial<AppState> = {}): AppState => ({
  version: 7,
  monsters: [],
  pcs: [],
  encounters: [],
  notes: [],
  log: [],
  campaigns: [],
  campaignMembers: [],
  activeCampaignId: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// canStartCombat
// ---------------------------------------------------------------------------
describe("canStartCombat", () => {
  it("allows start when no campaign is assigned to the encounter", () => {
    const encounters: Encounter[] = [makeEncounter("enc-1", undefined, false)];
    assert.equal(canStartCombat(encounters, "enc-1"), true);
  });

  it("allows start when no other encounter in the same campaign is running", () => {
    const encounters: Encounter[] = [
      makeEncounter("enc-1", "camp-A", false),
      makeEncounter("enc-2", "camp-A", false),
    ];
    assert.equal(canStartCombat(encounters, "enc-1"), true);
  });

  it("blocks start when another encounter in the same campaign is already running", () => {
    const encounters: Encounter[] = [
      makeEncounter("enc-1", "camp-A", false),
      makeEncounter("enc-2", "camp-A", true), // already running
    ];
    assert.equal(canStartCombat(encounters, "enc-1"), false);
  });

  it("allows start when the running encounter belongs to a different campaign", () => {
    const encounters: Encounter[] = [
      makeEncounter("enc-1", "camp-A", false),
      makeEncounter("enc-2", "camp-B", true), // different campaign
    ];
    assert.equal(canStartCombat(encounters, "enc-1"), true);
  });

  it("returns true for the encounter that is already running (re-dispatching COMBAT_STARTED to itself)", () => {
    const encounters: Encounter[] = [
      makeEncounter("enc-1", "camp-A", true),
    ];
    // enc-1 is itself running; no other conflicting encounter
    assert.equal(canStartCombat(encounters, "enc-1"), true);
  });
});

// ---------------------------------------------------------------------------
// deleteCampaignFromState
// ---------------------------------------------------------------------------
describe("deleteCampaignFromState", () => {
  it("removes the campaign from the campaigns list", () => {
    const state = makeState({
      campaigns: [
        { id: "camp-A", name: "Campaign A", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "camp-B", name: "Campaign B", createdAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
    const next = deleteCampaignFromState(state, "camp-A");
    assert.deepEqual(
      next.campaigns.map((c) => c.id),
      ["camp-B"]
    );
  });

  it("removes all campaign members belonging to the campaign", () => {
    const state = makeState({
      campaigns: [{ id: "camp-A", name: "A", createdAt: "" }],
      campaignMembers: [
        { id: "m-1", campaignId: "camp-A", pcId: "pc-1" },
        { id: "m-2", campaignId: "camp-A", pcId: "pc-2" },
        { id: "m-3", campaignId: "camp-B", pcId: "pc-1" },
      ],
    });
    const next = deleteCampaignFromState(state, "camp-A");
    assert.deepEqual(
      next.campaignMembers.map((m) => m.id),
      ["m-3"]
    );
  });

  it("removes encounters scoped to the deleted campaign", () => {
    const state = makeState({
      campaigns: [{ id: "camp-A", name: "A", createdAt: "" }],
      encounters: [
        makeEncounter("enc-A1", "camp-A", false),
        makeEncounter("enc-A2", "camp-A", false),
        makeEncounter("enc-B1", "camp-B", false),
        makeEncounter("enc-none", undefined, false),
      ],
    });
    const next = deleteCampaignFromState(state, "camp-A");
    assert.deepEqual(
      next.encounters.map((e) => e.id),
      ["enc-B1", "enc-none"]
    );
  });

  it("removes notes and log entries scoped to the deleted campaign", () => {
    const state = makeState({
      campaigns: [{ id: "camp-A", name: "A", createdAt: "" }],
      notes: [
        { id: "n-1", title: "t", body: "b", tags: [], createdAt: "", campaignId: "camp-A" },
        { id: "n-2", title: "t", body: "b", tags: [], createdAt: "", campaignId: "camp-B" },
        { id: "n-3", title: "t", body: "b", tags: [], createdAt: "" },
      ],
      log: [
        { id: "l-1", timestamp: "", text: "x", campaignId: "camp-A" },
        { id: "l-2", timestamp: "", text: "y", campaignId: "camp-B" },
        { id: "l-3", timestamp: "", text: "z" },
      ],
    });
    const next = deleteCampaignFromState(state, "camp-A");
    assert.deepEqual(
      next.notes.map((n) => n.id),
      ["n-2", "n-3"]
    );
    assert.deepEqual(
      next.log.map((l) => l.id),
      ["l-2", "l-3"]
    );
  });

  it("clears activeCampaignId when the active campaign is deleted", () => {
    const state = makeState({
      campaigns: [{ id: "camp-A", name: "A", createdAt: "" }],
      activeCampaignId: "camp-A",
    });
    const next = deleteCampaignFromState(state, "camp-A");
    assert.equal(next.activeCampaignId, null);
  });

  it("preserves activeCampaignId when a different campaign is deleted", () => {
    const state = makeState({
      campaigns: [
        { id: "camp-A", name: "A", createdAt: "" },
        { id: "camp-B", name: "B", createdAt: "" },
      ],
      activeCampaignId: "camp-B",
    });
    const next = deleteCampaignFromState(state, "camp-A");
    assert.equal(next.activeCampaignId, "camp-B");
  });
});
