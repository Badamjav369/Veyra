import { useState } from 'react';
import { useI18n } from '../../i18n/index';
import type { Contact } from '../../types';
import { Modal } from '../ui/Modal';
import { MemberPicker } from './MemberPicker';

export function InviteDialog({
  groupName,
  candidates,
  onInvite,
  onClose,
}: {
  groupName: string;
  candidates: Contact[];
  onInvite: (members: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Modal title={t('group.inviteTitle', { name: groupName })} labelId="invite-title" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (picked.length) onInvite(picked);
        }}
      >
        <p className="help">{t('group.inviteBody')}</p>
        {candidates.length === 0 ? (
          <p className="help">{t('group.noneLeft')}</p>
        ) : (
          <MemberPicker contacts={candidates} picked={picked} onToggle={toggle} />
        )}
        <div className="form__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            {t('group.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={picked.length === 0}>
            {t('group.inviteSubmit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
