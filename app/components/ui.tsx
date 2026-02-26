import Link from "next/link";
import { X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
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
  <div className="mb-6 flex flex-col gap-1">
    <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
    {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
  </div>
);

export const PageShell = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-10", className)} {...props} />
);

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-black/10 bg-surface p-5 text-foreground shadow-[0_12px_30px_rgba(0,0,0,0.08)]",
      className
    )}
    {...props}
  />
);

const buttonBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-all";

const buttonVariants = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-strong",
  outline:
    "border border-black/10 bg-transparent text-foreground hover:border-accent hover:text-accent",
  ghost: "bg-transparent text-muted hover:text-accent",
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

export const Input = ({ className, style, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
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
  className,
}: {
  current: number;
  max: number;
  className?: string;
}) => {
  const pct = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
  const { fg, bg } = hpBarColors(current, max);
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ backgroundColor: bg }}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${pct * 100}%`, backgroundColor: fg }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// ConditionChip — dismissible condition badge
// ---------------------------------------------------------------------------
export const ConditionChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) => (
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
  conditions: string[];
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

export const DialogContent = ({
  children,
  className,
  maxWidth = "2xl",
  fullHeight = false,
  ...props
}: ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  maxWidth?: keyof typeof dialogMaxWidths;
  fullHeight?: boolean;
}) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[1px]" />
    <RadixDialog.Content
      {...props}
      className={cn(
        "fixed left-1/2 top-8 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-black/10 bg-surface p-5 text-foreground shadow-2xl outline-none",
        fullHeight
          ? "bottom-8 flex flex-col overflow-hidden"
          : "max-h-[calc(100vh-4rem)] overflow-y-auto",
        dialogMaxWidths[maxWidth],
        className
      )}
    >
      {children}
    </RadixDialog.Content>
  </RadixDialog.Portal>
);
