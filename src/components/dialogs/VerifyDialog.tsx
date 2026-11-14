import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/index';
import { useToast } from '../../lib/toast';
import { codePattern } from '../../lib/visual';
import { nameOf } from '../../state/chat';
import type { Contact, Profile } from '../../types';
import { CheckIcon, CopyIcon, LockIcon, ShieldIcon, WarnIcon } from '../ui/Icons';
import { Identicon, ProfileAvatar } from '../ui/Identicon';
import { Modal } from '../ui/Modal';
import { copyText } from '../../lib/clipboard';

export function VerifyDialog({
  profile,
  contact,
  onSetVerified,
  onClose,
}: {
  profile: Profile;
  contact: Contact;
  onSetVerified: (verified: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const notify = useToast();
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState<'match' | 'mismatch' | null>(null);
  const cells = useMemo(() => codePattern(contact.safety.join('')), [contact.safety]);
  const name = nameOf(contact);

  const compare = (e: FormEvent) => {
    e.preventDefault();
    const digits = pasted.replace(/\D/g, '');
    setResult(digits === contact.safety.join('') ? 'match' : 'mismatch');
  };

  return (
    <Modal title={t('verify.title')} labelId="verify-title" onClose={onClose} width={460}>
      <div className="verify">
        <div className="verify__pair" aria-hidden="true">
          <span className="verify__who">
            <ProfileAvatar avatar={profile.avatar} size={52} label={profile.handle} />
            <small>{profile.handle}</small>
          </span>
          <span className="verify__link">
            <i />
            <span className="verify__lock">
              <LockIcon size={15} />
            </span>
            <i />
          </span>
          <span className="verify__who">
            <Identicon seed={contact.id} color={contact.color} size={52} photo={contact.avatar} />
            <small>{contact.handle}</small>
          </span>
        </div>

        <p className="help help--center">{t('verify.body', { name })}</p>

        <div className="code" role="img" aria-label={t('verify.code', { name })}>
          <svg viewBox="0 0 21 21" width="150" height="150" shapeRendering="crispEdges" aria-hidden="true">
            {cells.map((on, i) => (on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width={1} height={1} /> : null))}
          </svg>
        </div>

        <div className="safety-grid safety-grid--4">
          {contact.safety.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={async () => {
            if (await copyText(contact.safety.join(' '))) notify(t('verify.copied'));
          }}
        >
          <CopyIcon size={15} />
          {t('verify.copy')}
        </button>

        <form className="paste-compare" onSubmit={compare}>
          <label htmlFor="paste-number" className="label">
            {t('verify.pasteLabel')}
          </label>
          <div className="field">
            <input
              id="paste-number"
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setResult(null);
              }}
              placeholder={t('verify.pastePh')}
              inputMode="numeric"
              autoComplete="off"
            />
            <button type="submit" className="btn btn--outline btn--small" disabled={!pasted.trim()}>
              {t('verify.check')}
            </button>
          </div>
          {result && (
            <p className={`callout ${result === 'match' ? 'callout--ok' : 'callout--warn'}`} role="status">
              {result === 'match' ? <CheckIcon size={15} /> : <WarnIcon size={15} />}
              {result === 'match' ? t('verify.match') : t('verify.mismatch')}
            </p>
          )}
        </form>

        {contact.verified ? (
          <button
            type="button"
            className="btn btn--outline btn--block"
            onClick={() => {
              onSetVerified(false);
              onClose();
            }}
          >
            {t('verify.unmark')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={result === 'mismatch'}
            onClick={() => {
              onSetVerified(true);
              onClose();
            }}
          >
            <ShieldIcon size={17} />
            {t('verify.mark')}
          </button>
        )}
        <p className="help help--center help--small">{t('verify.footer')}</p>
      </div>
    </Modal>
  );
}
