"use client";
import { ChevronDown, FileText, Braces } from "lucide-react";
import { Button, cn, Popover, PopoverTrigger, PopoverContent } from "./ui";

interface ExportMenuProps {
  onMarkdown: () => void;
  onJSON: () => void;
  disabled?: boolean;
  /** Optional override for the trigger button's className */
  className?: string;
}

export function ExportMenu({
  onMarkdown,
  onJSON,
  disabled = false,
  className,
}: ExportMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          title={disabled ? "Select a campaign first" : undefined}
          className={cn("flex items-center gap-1.5", className)}
        >
          Export
          <ChevronDown size={14} />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={4} className="w-44 p-1">
        <button
          onClick={onMarkdown}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-strong"
        >
          <FileText size={14} className="text-muted" />
          Download Markdown
        </button>
        <button
          onClick={onJSON}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-strong"
        >
          <Braces size={14} className="text-muted" />
          Download JSON
        </button>
      </PopoverContent>
    </Popover>
  );
}
