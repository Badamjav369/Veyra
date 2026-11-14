import type { FormEvent } from 'react';
import { useState } from 'react';
import { useI18n } from '../../i18n/index';
import { contactCode, parseContactCode } from '../../lib/crypto';
import { useToast } from '../../lib/toast';
import type { Contact, Profile } from '../../types';
import { CopyIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { copyText } from '../../lib/clipboard';

const HANDLE_RE = /^[a-z0-9._-]{2,24}$/;

export function AddContactDialog({
  profile,
  existing,
  online,
  lookup,
  onAdd,
  onClose,
}: {
  profile: Profile;
  existing: Contact[];
  online: boolean;
  lookup: (handle: string) => Promise<Contact>;
  onAdd: (contact: Contact) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const notify = useToast();
  const [handle, setHandle] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const myCode = contactCode(profile.handle, profile.publicKey);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    let h = handle.trim().replace(/^@/, '').toLowerCase();
    let publicKey: string | undefined;
    if (code.trim()) {
      const parsed = parseContactCode(code);
      if (!parsed) return setError(t('contact.invalidCode'));
      h = h || parsed.handle;
      publicKey = parsed.publicKey;
    }
    if (!HANDLE_RE.test(h)) return setError(t('contact.invalidHandle'));
    if (h === profile.handle) return setError(t('contact.self'));
    if (existing.some((c) => c.handle === h)) return setError(t('contact.exists'));
    if (!online) return setError(t('contact.offline'));
    setBusy(true);
    try {
      // Ask the server for their public identity key (nothing secret is involved).
      const found = await lookup(h);
      if (publicKey && publicKey !== found.publicKey) {
        setBusy(false);
        return setError(t('contact.codeMismatch'));
      }
      onAdd({ ...found, nickname: nickname.trim() });
    } catch (err) {
      setBusy(false);
      setError((err as { code?: string }).code === 'not_found' ? t('contact.notFound') : t('contact.offline'));
    }
  };

  return (
    <Modal title={t('contact.title')} labelId="contact-title" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="help">{t('contact.body')}</p>
        <div className="form__row">
          <label htmlFor="ct-handle" className="label">
            {t('contact.handle')}
          </label>
          <div className="field">
            <span className="field__prefix" aria-hidden="true">
              @
            </span>
            <input
              id="ct-handle"
              value={handle}
              maxLength={25}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>
        <div className="form__row">
          <label htmlFor="ct-code" className="label">
            {t('contact.code')}
          </label>
          <textarea
            id="ct-code"
            className="textarea mono"
            rows={2}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('contact.codePh')}
            spellCheck={false}
          />
        </div>
        <div className="form__row">
          <label htmlFor="ct-nick" className="label">
            {t('contact.nickname')}
          </label>
          <div className="field">
            <input id="ct-nick" value={nickname} maxLength={32} onChange={(e) => setNickname(e.target.value)} autoComplete="off" />
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="my-code">
          <div className="my-code__head">
            <span className="label">{t('contact.myCode')}</span>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={async () => {
                if (await copyText(myCode)) notify(t('contact.copied'));
              }}
            >
              <CopyIcon size={14} />
              {t('contact.copy')}
            </button>
          </div>
          <code>{myCode}</code>
          <small>{t('contact.myCodeHint')}</small>
        </div>

        <div className="form__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            {t('group.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || (!handle.trim() && !code.trim())}>
            {busy ? t('contact.looking') : t('contact.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
