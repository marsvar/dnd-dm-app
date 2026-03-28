"use client";

import { RotateCw } from "lucide-react";
import { Button, Card } from "../../components/ui";

type InviteChangedBannerProps = {
  onRestart: () => void;
};

export default function InviteChangedBanner({ onRestart }: InviteChangedBannerProps) {
  return (
    <Card className="border-accent/30 bg-accent/5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Invite changed</p>
          <p className="text-xs text-muted">
            A newer invite was opened in another tab. Restart to continue with the latest link.
          </p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={onRestart}>
          <RotateCw size={16} />
          Restart
        </Button>
      </div>
    </Card>
  );
}
