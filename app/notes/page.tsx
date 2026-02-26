"use client";

import { useState } from "react";
import { Button, Card, Input, PageShell, Pill, SectionTitle, Textarea } from "../components/ui";
import { useAppStore } from "../lib/store/appStore";

export default function NotesPage() {
  const { state, addNote, removeNote } = useAppStore();
  const [form, setForm] = useState({ title: "", body: "", tags: "" });

  const activeCampaignId = state.activeCampaignId;
  const visibleNotes = activeCampaignId
    ? state.notes.filter((n) => n.campaignId === activeCampaignId)
    : state.notes;

  const handleAdd = () => {
    if (!form.title.trim()) {
      return;
    }
    addNote({
      title: form.title.trim(),
      body: form.body.trim(),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      ...(activeCampaignId ? { campaignId: activeCampaignId } : {}),
    });
    setForm({ title: "", body: "", tags: "" });
  };

  return (
    <PageShell>
      <SectionTitle
        title="Campaign Notes"
        subtitle="Track scenes, NPCs, and discoveries."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {visibleNotes.map((note) => (
          <Card key={note.id} className="space-y-3 bg-surface">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{note.title}</h3>
                <p className="text-xs text-muted">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" onClick={() => removeNote(note.id)}>
                Remove
              </Button>
            </div>
            <p className="text-sm text-muted whitespace-pre-line">{note.body}</p>
            {note.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <Pill key={tag} label={tag} />
                ))}
              </div>
            ) : null}
          </Card>
        ))}
        {!visibleNotes.length ? (
          <p className="text-sm text-muted">{activeCampaignId ? "No notes for this campaign yet." : "Capture your first session note."}</p>
        ) : null}
      </div>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold">Add a note</h3>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Title</p>
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Body</p>
          <Textarea
            rows={5}
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Tags</p>
          <Input
            value={form.tags}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAdd}>Add note</Button>
        </div>
      </Card>
    </PageShell>
  );
}
