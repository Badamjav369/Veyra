/**
 * Veyra mark: a periwinkle tile with a "V" drawn as two round-capped strokes that meet at one point —
 * two people, one private line. The left arm is the deep accent ink, the right arm the peach companion.
 */
export function LogoShapes() {
  return (
    <>
      <rect width="64" height="64" rx="20.5" style={{ fill: 'var(--accent, #aebbea)' }} />
      <g transform="translate(9.6 9.6) scale(1.8667)" fill="none" strokeWidth="3.6" strokeLinecap="round">
        <path d="M5.8 6 12 18.2" style={{ stroke: 'var(--accent-ink, #1f2757)' }} />
        <path d="M18.2 6 12 18.2" style={{ stroke: 'var(--peach, #f6bfa8)' }} />
      </g>
    </>
  );
}

export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} className="logo-mark">
      <LogoShapes />
    </svg>
  );
}

/** Mark + wordmark. */
export function Logo({ size = 28, showWord = true }: { size?: number; showWord?: boolean }) {
  return (
    <span className="logo" aria-label="Veyra" role="img">
      <LogoMark size={size} />
      {showWord && (
        <span className="logo__word" aria-hidden="true">
          Veyra
        </span>
      )}
    </span>
  );
}
