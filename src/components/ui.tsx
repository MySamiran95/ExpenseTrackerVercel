import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { clampIsoDate, isValidIsoDate, todayIso } from "@/lib/keep";
import { cn } from "@/lib/utils";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "night" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-medium transition-transform duration-150 ease-out disabled:opacity-50",
        "active:not-disabled:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage",
        variant === "primary" && "bg-ink text-cream",
        variant === "secondary" && "bg-cream text-ink shadow-soft",
        variant === "ghost" && "bg-transparent text-ink",
        variant === "night" && "bg-night-3 text-on-night",
        variant === "danger" && "bg-danger text-cream",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-line bg-cream px-3.5 text-sm text-ink outline-none",
        "placeholder:text-faint focus:border-sage focus:ring-2 focus:ring-sage/20",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-line bg-cream px-3.5 py-2.5 text-sm text-ink outline-none",
        "placeholder:text-faint focus:border-sage focus:ring-2 focus:ring-sage/20",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-md border border-line bg-cream bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-3.5 pr-9 text-sm text-ink outline-none keep-select",
        "focus:border-sage focus:ring-2 focus:ring-sage/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "sage" | "terra" | "danger" | "night";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium",
        tone === "muted" && "bg-paper-2 text-muted",
        tone === "sage" && "bg-sage/15 text-sage-deep",
        tone === "terra" && "bg-terra/15 text-terra",
        tone === "danger" && "bg-danger/10 text-danger",
        tone === "night" && "bg-night-3 text-on-night-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-paper-2", className)} />;
}

export function MemberChip({
  name,
  night,
}: {
  name: string;
  night?: boolean;
}) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? "?"
      : parts.length === 1
        ? (parts[0] ?? "?").slice(0, 2).toUpperCase()
        : `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full text-[9px] font-medium",
          night ? "bg-night-3 text-on-night" : "bg-sage/20 text-sage-deep",
        )}
      >
        {initials}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

export function DateField({
  value,
  onChange,
  max,
}: {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
}) {
  const iso = isValidIsoDate(value) ? value : clampIsoDate(value);
  const maxIso = max && isValidIsoDate(max) ? max : todayIso();
  const minYear = new Date().getFullYear() - 24;
  return (
    <Input
      type="date"
      aria-label="Date"
      value={iso}
      min={`${minYear}-01-01`}
      max={maxIso}
      onChange={(e) => {
        const next = e.target.value;
        if (!next) return;
        const clamped = isValidIsoDate(next) ? next : clampIsoDate(next, iso);
        onChange(clamped > maxIso ? maxIso : clamped);
      }}
    />
  );
}
