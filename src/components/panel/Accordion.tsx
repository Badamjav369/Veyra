import type { ReactNode } from 'react';
import { ChevronRightIcon } from '../ui/Icons';

interface Props {
  id: string;
  /** The icon tile that says what the row is about. */
  icon: ReactNode;
  title: string;
  /** One line that tells the current state without opening the item. */
  summary: string;
  tone?: 'warn' | 'danger';
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** One entry in the side panel's list: a header you can read at a glance, and a body that opens below it. */
export function Accordion({ id, icon, title, summary, tone, open, onToggle, children }: Props) {
  return (
    <li className={`acc ${open ? 'is-open' : ''} ${tone ? `acc--${tone}` : ''}`} data-section={id}>
      <h3 className="acc__head">
        <button type="button" id={`acc-${id}`} aria-expanded={open} aria-controls={`acc-body-${id}`} onClick={onToggle}>
          <span className="acc__icon" aria-hidden="true">
            {icon}
          </span>
          <span className="acc__text">
            <span className="acc__title">{title}</span>
            <span className="acc__summary">{summary}</span>
          </span>
          <ChevronRightIcon size={18} />
        </button>
      </h3>
      {open && (
        <div className="acc__body" id={`acc-body-${id}`} role="region" aria-labelledby={`acc-${id}`}>
          {children}
        </div>
      )}
    </li>
  );
}
