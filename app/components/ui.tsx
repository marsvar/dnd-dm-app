"use client";
import Link from "next/link";
import { X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import * as RadixPopover from "@radix-ui/react-popover";
import * as RadixTabs from "@radix-ui/react-tabs";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React, {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useState,
} from "react";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));


export const SectionTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <div className="mb-6 flex flex-col gap-1.5">
    <h2 className="text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">{title}</h2>
    {subtitle ? <p className="text-sm leading-relaxed text-muted">{subtitle}</p> : null}
  </div>
);

export const PageShell = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-10", className)} {...props} />
);

export const Card = ({
  className,
  hoverable,
  ...props
}: HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }) => (
  <div
    className={cn(
      "rounded-2xl border border-black/10 bg-surface p-5 text-foreground shadow-[var(--shadow-card)]",
      "animate-[cardEnter_250ms_ease-out_both]",
      hoverable && "transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-dialog)]",
      className
    )}
    {...props}
  />
);

const buttonBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.96]";

const buttonVariants = {
  primary:
    "bg-accent text-white shadow-[var(--shadow-button)] hover:bg-accent-strong active:shadow-none",
  outline:
    "border border-black/10 bg-transparent text-foreground hover:border-accent hover:text-accent active:bg-surface-strong",
  ghost: "bg-transparent text-muted hover:text-accent active:opacity-70",
};

export const Button = ({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
}) => {
  return (
    <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />
  );
};

export const LinkButton = ({
  href,
  className,
  variant = "primary",
  children,
}: {
  href: string;
  className?: string;
  variant?: keyof typeof buttonVariants;
  children: ReactNode;
}) => (
  <Link href={href} className={cn(buttonBase, buttonVariants[variant], className)}>
    {children}
  </Link>
);

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-[var(--ring)]",
        className
      )}
      style={{
        color: "var(--foreground)",
        WebkitTextFillColor: "var(--foreground)",
        caretColor: "var(--foreground)",
        ...style,
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = ({
  className,
  style,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "w-full rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-[var(--ring)]",
      className
    )}
    style={{
      color: "var(--foreground)",
      WebkitTextFillColor: "var(--foreground)",
      caretColor: "var(--foreground)",
      ...style,
    }}
    {...props}
  />
);

export const Pill = ({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: "neutral" | "accent" | "stat";
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs",
      tone === "accent"
        ? "bg-accent font-semibold text-white"
        : tone === "stat"
          ? "bg-surface-strong font-mono text-foreground"
          : "bg-surface-strong font-semibold text-muted",
      className
    )}
  >
    {label}
  </span>
);

// ---------------------------------------------------------------------------
// StatTile — number + label display tile (use for summary stats in dialogs/cards)
// ---------------------------------------------------------------------------
export const StatTile = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl bg-surface-strong p-3 text-center">
    <p className="font-mono text-2xl font-semibold text-foreground">{value}</p>
    <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted">{label}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------
export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      "w-full rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-[var(--ring)]",
      className
    )}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// FieldLabel
// ---------------------------------------------------------------------------
export const FieldLabel = ({
  htmlFor,
  className,
  children,
}: {
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className={cn("block text-xs uppercase tracking-[0.25em] text-muted", className)}
  >
    {children}
  </label>
);

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------
export const Checkbox = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    type="checkbox"
    className={cn(
      "h-4 w-4 rounded border border-black/10 bg-surface-strong accent-accent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1",
      className
    )}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// Panel — nested surface (use inside Card for sub-sections)
// ---------------------------------------------------------------------------
export const Panel = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-black/10 bg-surface-strong p-4",
      className
    )}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// HpBar — color-coded HP progress bar
// ---------------------------------------------------------------------------
function hpBarColors(current: number, max: number): { fg: string; bg: string } {
  if (max <= 0) return { fg: "var(--hp-zero)", bg: "var(--hp-zero-bg)" };
  const pct = current / max;
  if (current <= 0) return { fg: "var(--hp-zero)", bg: "var(--hp-zero-bg)" };
  if (pct <= 0.25) return { fg: "var(--hp-low)", bg: "var(--hp-low-bg)" };
  if (pct <= 0.74) return { fg: "var(--hp-mid)", bg: "var(--hp-mid-bg)" };
  return { fg: "var(--hp-full)", bg: "var(--hp-full-bg)" };
}

export const HpBar = ({
  current,
  max,
  tempHp,
  className,
  showLabel,
}: {
  current: number;
  max: number;
  tempHp?: number | null;
  className?: string;
  showLabel?: boolean;
}) => {
  const pct = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
  const { fg, bg } = hpBarColors(current, max);
  const label =
    showLabel && max > 0
      ? current <= 0
        ? { text: "Down", color: "var(--hp-zero)" }
        : pct <= 0.25
          ? { text: "Critical", color: "var(--hp-low)" }
          : pct <= 0.5
            ? { text: "Bloodied", color: "var(--hp-mid)" }
            : null
      : null;
  const tempPct = max > 0 && tempHp ? Math.min(1, tempHp / max) : 0;
  return (
    <div className={cn("w-full", showLabel && label ? "space-y-0.5" : "")}>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ? `HP: ${label.text}` : undefined}
        className={cn("h-2 w-full overflow-hidden rounded-full", className)}
        style={{ backgroundColor: bg }}
      >
        <div
          className="h-full rounded-full transition-[width,background-color] duration-300"
          style={{ width: `${pct * 100}%`, backgroundColor: fg }}
        />
      </div>
      {tempPct > 0 && (
        <div
          className="mt-0.5 overflow-hidden rounded-full"
          style={{ height: 3, backgroundColor: "var(--hp-temp-bg)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${tempPct * 100}%`, backgroundColor: "var(--hp-temp)" }}
          />
        </div>
      )}
      {label && (
        <span
          className="text-[0.6rem] font-semibold uppercase tracking-[0.15em]"
          style={{ color: label.color }}
        >
          {label.text}
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ConditionChip — dismissible condition badge with optional tooltip description
// ---------------------------------------------------------------------------
export const ConditionChip = ({
  label,
  description,
  onRemove,
}: {
  label: string;
  description?: string;
  onRemove?: () => void;
}) => {
  const chip = (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: "var(--condition-bg)", color: "var(--condition-fg)" }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove condition ${label}`}
          className="-mr-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );

  if (!description) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
};

// ConditionPicker — toggleable condition selector
// Renders a set of chips for known conditions (e.g. SRD list) plus a free-text
// input for custom conditions. Calls onChange immediately on each toggle so the
// parent can dispatch an event.
// ---------------------------------------------------------------------------
export const ConditionPicker = ({
  active,
  conditions,
  onChange,
}: {
  /** Currently active condition strings. */
  active: string[];
  /** Full list of known conditions to show as chips (e.g. SRD_CONDITIONS). */
  conditions: readonly string[];
  /** Called with the full next active list whenever a condition is toggled or added. */
  onChange: (next: string[]) => void;
}) => {
  const [draft, setDraft] = useState("");

  const toggle = (cond: string) => {
    const isOn = active.includes(cond);
    onChange(isOn ? active.filter((c) => c !== cond) : [...active, cond]);
  };

  const addCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!active.includes(trimmed)) onChange([...active, trimmed]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {conditions.map((cond) => {
          const isOn = active.includes(cond);
          return (
            <button
              key={cond}
              type="button"
              onClick={() => toggle(cond)}
              aria-pressed={isOn}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
                isOn
                  ? ""
                  : "border border-black/10 bg-surface text-muted hover:border-accent/40 hover:text-foreground"
              )}
              style={
                isOn
                  ? { backgroundColor: "var(--condition-bg)", color: "var(--condition-fg)" }
                  : undefined
              }
            >
              {cond}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addCustom(); }
          }}
          placeholder="Custom condition…"
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-surface-strong px-3 py-1.5 text-xs placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!draft.trim()}
          className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          Add
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dialog — accessible overlay built on @radix-ui/react-dialog.
// Handles focus trap, Escape key, click-outside, portal rendering, and ARIA.
//
// Usage:
//   <Dialog open={isOpen} onOpenChange={setIsOpen}>
//     <DialogContent maxWidth="2xl">
//       <DialogTitle>Title</DialogTitle>
//       …content…
//       <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
//     </DialogContent>
//   </Dialog>
// ---------------------------------------------------------------------------
const dialogMaxWidths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

/** Visually-hidden accessible title — use when the title is already visible in content. */
export const DialogTitle = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixDialog.Title>) => (
  <RadixDialog.Title className={cn("text-lg font-semibold text-foreground", className)} {...props} />
);

/** Optional accessible description for screen readers. Pass className="sr-only" to hide visually. */
export const DialogDescription = RadixDialog.Description;

/**
 * Modal overlay built on @radix-ui/react-dialog.
 *
 * `variant="default"` — centered modal. `maxWidth` and `fullHeight` apply.
 * `variant="sheet"` — bottom-anchored sheet (mobile). `maxWidth` and `fullHeight` are ignored.
 */
export const DialogContent = ({
  children,
  className,
  maxWidth = "2xl",
  fullHeight = false,
  variant = "default",
  ...props
}: ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  maxWidth?: keyof typeof dialogMaxWidths;
  fullHeight?: boolean;
  variant?: "default" | "sheet";
}) => {
  const contentCls =
    variant === "sheet"
      ? "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-black/10 bg-surface p-5 text-foreground shadow-[var(--shadow-dialog)] outline-none max-h-[85vh] overflow-y-auto"
      : cn(
          "fixed left-1/2 top-8 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-black/10 bg-surface p-5 text-foreground shadow-[var(--shadow-dialog)] outline-none",
          fullHeight
            ? "bottom-8 flex flex-col overflow-hidden"
            : "max-h-[calc(100vh-4rem)] overflow-y-auto",
          dialogMaxWidths[maxWidth]
        );

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[1px]" />
      <RadixDialog.Content {...props} className={cn(contentCls, className)}>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
};

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------
export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipContent = ({
  className,
  sideOffset = 4,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTooltip.Content>) => (
  <RadixTooltip.Portal>
    <RadixTooltip.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-xs rounded-lg border border-black/10 bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-md",
        className
      )}
      {...props}
    />
  </RadixTooltip.Portal>
);

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------
export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverContent = ({
  className,
  sideOffset = 6,
  align = "center",
  ...props
}: ComponentPropsWithoutRef<typeof RadixPopover.Content>) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "z-50 w-64 rounded-2xl border border-black/10 bg-surface p-4 text-foreground shadow-[var(--shadow-popover)]",
        className
      )}
      {...props}
    />
  </RadixPopover.Portal>
);

// ---------------------------------------------------------------------------
// Tabs — accessible tab navigation built on @radix-ui/react-tabs.
// Uses "line" variant by default (underline active tab) which fits the
// existing design token palette without needing a pill/chip background.
//
// Usage:
//   <Tabs defaultValue="prep">
//     <TabsList>
//       <TabsTrigger value="prep">Prep</TabsTrigger>
//       <TabsTrigger value="live">Live Combat</TabsTrigger>
//     </TabsList>
//     <TabsContent value="prep">…</TabsContent>
//     <TabsContent value="live">…</TabsContent>
//   </Tabs>
// ---------------------------------------------------------------------------
export const Tabs = RadixTabs.Root;

export const TabsList = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.List>) => (
  <RadixTabs.List
    className={cn(
      "flex items-center gap-1 border-b border-black/10",
      className
    )}
    {...props}
  />
);

export const TabsTrigger = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Trigger>) => (
  <RadixTabs.Trigger
    className={cn(
      "relative px-4 py-2.5 text-sm font-medium text-muted transition-colors",
      "hover:text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:rounded",
      "data-[state=active]:text-foreground",
      // Underline indicator on active tab — matches accent token
      "after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-accent after:opacity-0 after:transition-opacity",
      "data-[state=active]:after:opacity-100",
      className
    )}
    {...props}
  />
);

export const TabsContent = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Content>) => (
  <RadixTabs.Content
    className={cn("outline-none", className)}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// Skeleton — animated placeholder for loading states.
// Based on shadcn/ui Skeleton pattern; uses surface-strong as the base color
// so it blends naturally with card backgrounds.
// ---------------------------------------------------------------------------
export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "animate-pulse rounded-xl bg-surface-strong",
      className
    )}
    {...props}
  />
);

// ---------------------------------------------------------------------------
// EncounterStatusBadge — semantic encounter status with animated live dot.
// Replaces the plain Pill("Live"/"Prep"/"Completed") pattern throughout the
// encounter runner. The pulsing green dot is immediately recognisable mid-
// combat without requiring the DM to read the label text.
// ---------------------------------------------------------------------------
type EncounterStatus = "live" | "prep" | "completed";

const encounterStatusConfig: Record<
  EncounterStatus,
  { label: string; dotColor: string; textColor: string; bg: string; pulse: boolean }
> = {
  live:      { label: "Live",      dotColor: "var(--combat-live-dot)", textColor: "var(--combat-live-fg)", bg: "var(--combat-live-bg)", pulse: true  },
  prep:      { label: "Prep",      dotColor: "var(--hp-mid)",          textColor: "var(--hp-mid)",          bg: "var(--hp-mid-bg)",      pulse: false },
  completed: { label: "Completed", dotColor: "var(--muted)",           textColor: "var(--muted)",           bg: "var(--surface-strong)", pulse: false },
};

export const EncounterStatusBadge = ({
  status,
  className,
}: {
  status: EncounterStatus;
  className?: string;
}) => {
  const cfg = encounterStatusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      style={{ backgroundColor: cfg.bg, color: cfg.textColor }}
    >
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        {cfg.pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: cfg.dotColor }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: cfg.dotColor }}
        />
      </span>
      {cfg.label}
    </span>
  );
};
