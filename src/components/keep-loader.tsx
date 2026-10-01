import { KeepLogo } from "@/components/logo";

export function KeepLoader({ message = "Opening your ledger…" }: { message?: string }) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden bg-night px-8 text-on-night">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_30%,rgb(107_143_113/0.18),transparent_62%)]" />
      <div className="keep-loader-orbit pointer-events-none absolute size-64 rounded-full border border-sage/20" />
      <div className="keep-loader-orbit keep-loader-orbit-2 pointer-events-none absolute size-48 rounded-full border border-terra/25" />

      <div className="relative grid size-28 place-items-center">
        <span className="keep-loader-glow absolute inset-0 rounded-full bg-sage/20" />
        <KeepLogo className="relative size-20 shadow-night" alt="" />
      </div>

      <p className="relative mt-7 font-display text-3xl font-medium tracking-tight">Keep</p>
      <p className="relative mt-2 text-sm text-on-night-muted">{message}</p>
      <div className="relative mt-6 flex items-center gap-1.5" aria-hidden>
        <span className="keep-loader-dot size-1.5 rounded-full bg-sage" />
        <span className="keep-loader-dot keep-loader-dot-2 size-1.5 rounded-full bg-mustard" />
        <span className="keep-loader-dot keep-loader-dot-3 size-1.5 rounded-full bg-terra" />
      </div>
    </div>
  );
}
