import type { FormEvent } from 'react';
import { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { LockIcon, TrashIcon, WarnIcon } from '../../ui/Icons';

/**
 * Deleting the account is the last thing in the panel and only becomes available after the sign-in
 * password is typed again, so it can't be hit by accident (or by someone at an unlocked screen).
 */
export function AccountRemovalSection({ onVerifyPassword, onErase }: { onVerifyPassword: (password: string) => Promise<boolean>; onErase: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    const ok = await onVerifyPassword(password);
    setBusy(false);
    setPassword('');
    setWrong(!ok);
    setUnlocked(ok);
  };

  if (unlocked) {
    return (
      <div className="danger-zone__body">
        <p className="callout callout--warn">
          <WarnIcon size={16} />
          <span>{t('settings.eraseHint')}</span>
        </p>
        <button type="button" className="btn btn--danger btn--start" onClick={onErase}>
          <TrashIcon size={16} />
          {t('settings.erase')}
        </button>
      </div>
    );
  }

  return (
    <form className="danger-zone__body" onSubmit={submit}>
      <p className="help help--small">{t('settings.dangerIntro')}</p>
      <label className="sr-only" htmlFor="dz-pass">
        {t('settings.dangerPass')}
      </label>
      <div className="field">
        <LockIcon size={15} />
        <input
          id="dz-pass"
          type="password"
          autoComplete="current-password"
          placeholder={t('settings.dangerPass')}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setWrong(false);
          }}
        />
      </div>
      {wrong && (
        <p className="form-error" role="alert">
          {t('settings.dangerWrong')}
        </p>
      )}
      <button type="submit" className="btn btn--outline btn--small btn--start" disabled={busy || !password}>
        {busy ? t('common.working') : t('settings.dangerUnlock')}
      </button>
    </form>
  );
}
