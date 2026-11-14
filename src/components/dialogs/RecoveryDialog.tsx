import { useState } from 'react';
import { useI18n } from '../../i18n/index';
import { KeyIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { RecoveryCodeView } from '../auth/RecoveryCode';

/** Explains the recovery code and makes a new one (the old one stops working). */
export function RecoveryDialog({ handle, hasCode, onCreate, onClose }: { handle: string; hasCode: boolean; onCreate: () => Promise<string>; onClose: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Modal title={t('rc.title')} labelId="rc-title" onClose={onClose} width={460}>
      {code ? (
        <RecoveryCodeView handle={handle} code={code} onDone={onClose} doneLabel={t('rc.done')} />
      ) : (
        <div className="form">
          <p className="help help--body">{hasCode ? t('rc.newHint') : t('rc.intro')}</p>
          <div className="form__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              {t('rc.later')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setCode(await onCreate());
              }}
            >
              <KeyIcon size={16} />
              {busy ? t('common.working') : hasCode ? t('rc.new') : t('rc.create')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
