import { Card, LinkButton, PageShell, SectionTitle } from "../components/ui";

export default function EncountersPage() {
  return (
    <PageShell>
      <SectionTitle
        title="Encounters"
        subtitle="Prepare encounters in the Builder, then run them in the Player."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-lg font-semibold">Encounter Builder</h3>
          <p className="text-sm text-muted">
            Assemble encounters, set initiative, and prep participants before the session.
          </p>
          <LinkButton href="/encounters/builder">Open Builder</LinkButton>
        </Card>
        <Card className="space-y-3">
          <h3 className="text-lg font-semibold">Encounter Player</h3>
          <p className="text-sm text-muted">
            Run the encounter with turn controls, initiative order, and live HP updates.
          </p>
          <LinkButton href="/encounters/player">Open Player</LinkButton>
        </Card>
      </div>
    </PageShell>
  );
}
