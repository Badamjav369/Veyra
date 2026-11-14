import { useI18n } from '../../i18n/index';
import { Modal } from '../ui/Modal';


export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal title={title} labelId="confirm-title" onClose={onClose} width={400}>
      <div className="form">
        <p className="help help--body">{body}</p>
        <div className="form__actions">
          <button type="button" className="btn btn--outline" onClick={onClose} autoFocus>
            {t('confirm.cancel')}
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger-solid' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
