import { useState } from 'react';
import { useI18n } from '../../i18n/index';
import type { Contact } from '../../types';
import { WarnIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { MemberPicker } from './MemberPicker';

export function NewGroupDialog({
  contacts,
  onCreate,
  onClose,
}: {
  contacts: Contact[];
  onCreate: (name: string, members: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const cleanName = name.trim().replace(/^#+/, '').replace(/\s+/g, '-').slice(0, 32);
  const canCreate = cleanName.length > 0 && picked.length > 0;
  const pickedUnverified = contacts.some((c) => picked.includes(c.id) && !c.verified);
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Modal title={t('group.title')} labelId="group-title" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (canCreate) onCreate(cleanName, contacts.filter((c) => picked.includes(c.id)).map((c) => c.id));
        }}
      >
        <p className="help">{t('group.body')}</p>
        <div className="form__row">
          <label htmlFor="group-name" className="label">
            {t('group.name')}
          </label>
          <div className="field">
            <span className="field__prefix" aria-hidden="true">
              #
            </span>
            <input
              id="group-name"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('group.namePlaceholder')}
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>
        <fieldset className="form__row">
          <legend className="label">
            {t('group.members')} · {t('group.selected', { n: picked.length })}
          </legend>
          {contacts.length === 0 ? (
            <p className="help">{t('group.noContacts')}</p>
          ) : (
            <MemberPicker contacts={contacts} picked={picked} onToggle={toggle} />
          )}
        </fieldset>
        {pickedUnverified && (
          <p className="callout callout--warn">
            <WarnIcon size={15} />
            {t('group.warn')}
          </p>
        )}
        <div className="form__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            {t('group.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canCreate}>
            {t('group.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
