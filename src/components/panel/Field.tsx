import type { ReactNode } from 'react';

/** A labelled form row used inside the panel sections. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="form__row">
      <span className="label">{label}</span>
      {children}
      {hint && <small className="help help--small">{hint}</small>}
    </div>
  );
}
