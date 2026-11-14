import type { FormEvent } from 'react';
import { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { usePrefs } from '../../../state/prefs';
import type { Prefs } from '../../../state/prefs';
import { Segmented } from '../../ui/controls';
import { Field } from '../Field';

interface Props {
  onChangePassphrase: (current: string, next: string) => Promise<'ok' | 'wrong' | 'offline'>;
  recoveryAt?: number;
  onRecovery: () => void;
}

/** Account security: recovery code, password, and how fast the vault locks itself. */
export function SecuritySection({ onChangePassphrase, recoveryAt, onRecovery }: Props) {
  const { t, lang } = useI18n();
  const { prefs, setPrefs } = usePrefs();
  return (
    <>
      <div className="pass-change">
        <span className="label">{t('rc.title')}</span>
        {recoveryAt ? <p className="help">{t('rc.set', { date: new Date(recoveryAt).toLocaleDateString(lang) })}</p> : <p className="callout callout--warn">{t('rc.missing')}</p>}
        <button type="button" className="btn btn--outline" onClick={onRecovery}>
          {recoveryAt ? t('rc.new') : t('rc.create')}
        </button>
      </div>
      <Field label={t('settings.autoLock')} hint={t('settings.autoLockHint')}>
        <Segmented<Prefs['autoLock']>
          label={t('settings.autoLock')}
          value={prefs.autoLock}
          onChange={(autoLock) => setPrefs({ autoLock })}
          options={([0, 1, 5, 15, 60] as const).map((v) => ({ value: v, label: t(`lock.${v}`) }))}
        />
      </Field>
      <ChangePassphrase onChange={onChangePassphrase} />
    </>
  );
}

function ChangePassphrase({ onChange }: { onChange: (current: string, next: string) => Promise<'ok' | 'wrong' | 'offline'> }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setMsg({ tone: 'error', text: t('settings.passShort') });
    if (next !== again) return setMsg({ tone: 'error', text: t('settings.passMismatch') });
    setBusy(true);
    const result = await onChange(current, next);
    setBusy(false);
    if (result === 'ok') {
      setCurrent('');
      setNext('');
      setAgain('');
      setMsg({ tone: 'ok', text: t('settings.passChanged') });
    } else setMsg({ tone: 'error', text: result === 'wrong' ? t('settings.passWrong') : t('settings.passOffline') });
  };

  const rows: { id: string; label: string; value: string; set: (v: string) => void; auto: string }[] = [
    { id: 'pc-cur', label: t('settings.currentPass'), value: current, set: setCurrent, auto: 'current-password' },
    { id: 'pc-new', label: t('settings.newPass'), value: next, set: setNext, auto: 'new-password' },
    { id: 'pc-again', label: t('settings.confirmPass'), value: again, set: setAgain, auto: 'new-password' },
  ];

  return (
    <form className="pass-change" onSubmit={submit}>
      <span className="label">{t('settings.changePass')}</span>
      {rows.map((r) => (
        <div key={r.id}>
          <label className="sr-only" htmlFor={r.id}>
            {r.label}
          </label>
          <div className="field">
            <input id={r.id} type="password" autoComplete={r.auto} placeholder={r.label} value={r.value} onChange={(e) => r.set(e.target.value)} />
          </div>
        </div>
      ))}
      {msg && (
        <p className={msg.tone === 'ok' ? 'callout callout--ok' : 'form-error'} role="status">
          {msg.text}
        </p>
      )}
      <button type="submit" className="btn btn--outline" disabled={busy || !current || !next}>
        {busy ? t('common.working') : t('settings.changePass')}
      </button>
    </form>
  );
}
