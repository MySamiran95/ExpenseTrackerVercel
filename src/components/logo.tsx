import { cn } from "@/lib/utils";

export function KeepLogo({
  className,
  alt = "Keep",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/icon-192.png"
      alt={alt}
      className={cn("size-10 rounded-[22%] object-cover shadow-soft", className)}
    />
  );
}

export function CompassMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("text-sage-deep", className)} aria-hidden>
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M32 8 L36.4 28.4 L56 32 L36.4 35.6 L32 56 L27.6 35.6 L8 32 L27.6 28.4 Z"
        fill="currentColor"
      />
      <circle cx="32" cy="32" r="4.2" fill="var(--color-night)" />
      <path
        d="M32 24.8 L33.8 30.2 L39.2 32 L33.8 33.8 L32 39.2 L30.2 33.8 L24.8 32 L30.2 30.2 Z"
        fill="var(--color-sage)"
      />
    </svg>
  );
}

export function Stamp({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid size-24 place-items-center rounded-full border border-sage-deep/40",
        className,
      )}
    >
      <svg viewBox="0 0 120 120" className="keep-spin-slow absolute inset-0 size-full">
        <defs>
          <path id="keep-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <text fill="currentColor" className="fill-sage-deep" fontSize="9" letterSpacing="2.4">
          <textPath href="#keep-circle">KEEP · SPEND SAVE MORE · KEEP ·</textPath>
        </text>
      </svg>
      <KeepLogo className="size-12 shadow-none" alt="" />
    </div>
  );
}
