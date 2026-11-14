import { fingerprint } from '../../../../shared/e2ee';
import { useI18n } from '../../../i18n/index';
import { activeId, contactOf, convoMeta } from '../../../state/chat';
import type { ChatState } from '../../../types';

/** The technical facts about how this conversation is protected. */
export function EncryptionSection({ state }: { state: ChatState }) {
  const { t } = useI18n();
  const id = activeId(state);
  const meta = convoMeta(state, id);
  if (!meta) return null;
  const isGroup = meta.kind === 'group';
  const contact = isGroup ? undefined : state.contacts[contactOf(id)];

  return (
    <dl className="facts">
      <div>
        <dt>{t('info.protocol')}</dt>
        <dd>{isGroup ? t('info.protocolGroup') : t('info.protocolDirect')}</dd>
      </div>
      {contact ? (
        <>
          <div>
            <dt>{t('info.ratchet')}</dt>
            <dd className="mono">{state.crypto.sessions[contact.id] ? state.crypto.sessions[contact.id].ratchet.steps : <small>{t('info.notStarted')}</small>}</dd>
          </div>
          <div>
            <dt>{t('info.theirKey')}</dt>
            <dd className="mono">{fingerprint(contact.publicKey)}</dd>
          </div>
        </>
      ) : (
        <>
          <div>
            <dt>{t('info.epoch')}</dt>
            <dd className="mono">#{meta.epoch}</dd>
          </div>
          <div>
            <dt>{t('info.members')}</dt>
            <dd className="mono">{meta.members.length + 1}</dd>
          </div>
        </>
      )}
      <div>
        <dt>{t('info.sealed')}</dt>
        <dd>{t('info.sealedOn')}</dd>
      </div>
    </dl>
  );
}
