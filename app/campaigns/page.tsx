"use client";

/**
 * /campaigns — Campaign management page.
 *
 * DM can:
 *  - Create campaigns (name + optional description)
 *  - Rename / delete campaigns
 *  - Set the active campaign (scopes encounters, notes, log)
 *  - Manage each campaign's party (add / remove PCs)
 */

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Input,
  PageShell,
  Pill,
  SectionTitle,
  Textarea,
  cn,
} from "../components/ui";
import { useAppStore } from "../lib/store/appStore";
import { ParticipantAvatar } from "../components/ParticipantAvatar";
import { CheckCircle, Trash2, Users } from "lucide-react";

// ---------------------------------------------------------------------------
// Sub-component: party management for a single campaign
// ---------------------------------------------------------------------------
function CampaignPartySection({ campaignId }: { campaignId: string }) {
  const { state, addCampaignMember, removeCampaignMember } = useAppStore();

  const memberPcIds = useMemo(
    () =>
      new Set(
        state.campaignMembers
          .filter((m) => m.campaignId === campaignId)
          .map((m) => m.pcId)
      ),
    [state.campaignMembers, campaignId]
  );

  const members = state.pcs.filter((pc) => memberPcIds.has(pc.id));
  const nonMembers = state.pcs.filter((pc) => !memberPcIds.has(pc.id));

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs uppercase tracking-[0.25em] text-muted">Party</p>

      {members.length === 0 && (
        <p className="text-sm text-muted">No party members yet.</p>
      )}

      <ul className="flex flex-col gap-2">
        {members.map((pc) => (
          <li
            key={pc.id}
            className="flex items-center gap-3 rounded-xl border border-black/5 bg-surface-strong px-3 py-2"
          >
            <ParticipantAvatar name={pc.name} visual={pc.visual} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{pc.name}</p>
              <p className="text-xs text-muted">
                {[pc.race, pc.className, `Lvl ${pc.level}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => removeCampaignMember(campaignId, pc.id)}
              aria-label={`Remove ${pc.name} from party`}
            >
              <Trash2 size={14} />
            </Button>
          </li>
        ))}
      </ul>

      {nonMembers.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Add to party</p>
          <div className="flex flex-wrap gap-2">
            {nonMembers.map((pc) => (
              <button
                key={pc.id}
                type="button"
                onClick={() => addCampaignMember(campaignId, pc.id)}
                className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <Users size={11} />
                {pc.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CampaignsPage() {
  const { state, addCampaign, updateCampaign, deleteCampaign, setActiveCampaign } =
    useAppStore();

  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!form.name.trim()) return;
    addCampaign(form.name.trim(), form.description.trim() || undefined);
    setForm({ name: "", description: "" });
  };

  const handleStartEdit = (id: string) => {
    const campaign = state.campaigns.find((c) => c.id === id);
    if (!campaign) return;
    setEditingId(id);
    setEditForm({ name: campaign.name, description: campaign.description ?? "" });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.name.trim()) return;
    updateCampaign(editingId, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
    });
    setEditingId(null);
  };

  // Encounters scoped per campaign for the encounter count badge
  const encountersByCampaign = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of state.encounters) {
      if (e.campaignId) {
        map[e.campaignId] = (map[e.campaignId] ?? 0) + 1;
      }
    }
    return map;
  }, [state.encounters]);

  return (
    <PageShell>
      <SectionTitle
        title="Campaigns"
        subtitle="Organise your sessions. The active campaign scopes encounters, notes, and log."
      />

      {/* --- Campaign list --- */}
      <div className="space-y-4">
        {state.campaigns.length === 0 && (
          <p className="text-sm text-muted">No campaigns yet. Create one below.</p>
        )}

        {state.campaigns.map((campaign) => {
          const isActive = state.activeCampaignId === campaign.id;
          const isEditing = editingId === campaign.id;
          const isExpanded = expandedId === campaign.id;
          const encounterCount = encountersByCampaign[campaign.id] ?? 0;

          return (
            <Card
              key={campaign.id}
              className={cn(
                "space-y-2 transition-all",
                isActive && "border-accent shadow-[0_0_0_2px_var(--accent)]"
              )}
            >
              {isEditing ? (
                /* ---- Edit mode ---- */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Name</p>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">
                      Description (optional)
                    </p>
                    <Input
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit}>Save</Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* ---- View mode ---- */
                <>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {campaign.name}
                        </h3>
                        {isActive && (
                          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                            <CheckCircle size={11} />
                            Active
                          </span>
                        )}
                        {encounterCount > 0 && (
                          <Pill label={`${encounterCount} encounter${encounterCount !== 1 ? "s" : ""}`} />
                        )}
                      </div>
                      {campaign.description && (
                        <p className="mt-0.5 text-sm text-muted">{campaign.description}</p>
                      )}
                      <p className="text-xs text-muted">
                        Created {new Date(campaign.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!isActive && (
                        <Button onClick={() => setActiveCampaign(campaign.id)}>
                          Set Active
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => handleStartEdit(campaign.id)}>
                        Rename
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : campaign.id)
                        }
                      >
                        <Users size={14} />
                        <span className="ml-1">Party</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete campaign "${campaign.name}"? This will also remove all its encounters, notes, and log entries.`
                            )
                          ) {
                            deleteCampaign(campaign.id);
                          }
                        }}
                        aria-label={`Delete campaign ${campaign.name}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && <CampaignPartySection campaignId={campaign.id} />}
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* --- Create form --- */}
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold">New campaign</h3>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Name</p>
          <Input
            placeholder="The Ruins of Deepstone"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">
            Description (optional)
          </p>
          <Textarea
            rows={2}
            placeholder="A short-form dungeon crawl…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate}>Create campaign</Button>
        </div>
      </Card>
    </PageShell>
  );
}
