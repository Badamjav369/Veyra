import { useI18n } from '../../i18n/index';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';

/**
 * The tab that opens and closes the side panel. It sits on the panel's left edge (or on the
 * right edge of the chat while the panel is closed) and shares its background, so it reads as
 * part of the panel rather than a separate button.
 */
export function PanelHandle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const label = open ? t('panel.hide') : t('panel.show');
  return (
    <button
      type="button"
      className={`panel-handle ${open ? 'panel-handle--open' : ''}`}
      aria-expanded={open}
      aria-controls={open ? 'side-panel' : undefined}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {open ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
    </button>
  );
}
