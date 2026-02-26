"use client";

import { useState } from "react";
import { Button, Card, Input, PageShell, SectionTitle } from "../components/ui";
import { useAppStore } from "../lib/store/appStore";

export default function LogPage() {
  const { state, addLogEntry } = useAppStore();
  const [text, setText] = useState("");

  const activeCampaignId = state.activeCampaignId;
  const visibleLog = activeCampaignId
    ? state.log.filter((l) => l.campaignId === activeCampaignId)
    : state.log;

  const handleAdd = () => {
    if (!text.trim()) {
      return;
    }
    addLogEntry({
      text: text.trim(),
      ...(activeCampaignId ? { campaignId: activeCampaignId } : {}),
    });
    setText("");
  };

  return (
    <PageShell>
      <SectionTitle
        title="Combat Log"
        subtitle="Capture quick events and memorable rolls."
      />

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Add a log entry</h3>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Entry</p>
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAdd}>Add entry</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {visibleLog.map((entry) => (
          <Card key={entry.id} className={entry.source === "auto" ? "bg-surface/60" : "bg-surface"}>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
              {entry.source === "auto" && (
                <span className="rounded-full border border-black/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                  auto
                </span>
              )}
            </div>
            <p className={`text-sm ${entry.source === "auto" ? "text-muted" : "text-foreground"}`}>{entry.text}</p>
          </Card>
        ))}
        {!visibleLog.length ? (
          <p className="text-sm text-muted">{activeCampaignId ? "No log entries for this campaign yet." : "No log entries yet."}</p>
        ) : null}
      </div>
    </PageShell>
  );
}
