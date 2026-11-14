import { useI18n } from '../../../i18n/index';
import { activeId, convoMeta, contactOf, nameOf } from '../../../state/chat';
import type { ChatState } from '../../../types';
import { MinusCircleIcon, PlusIcon, ShieldIcon } from '../../ui/Icons';
import { Identicon, ProfileAvatar } from '../../ui/Identicon';

interface Props {
  state: ChatState;
  onVerify: () => void;
  onInvite: () => void;
  onRemoveMember: (handle: string) => void;
}

/** #1 for a direct chat: the safety number to compare. #1 for a group: who is in it and whether each person is verified. */
export function TrustSection({ state, onVerify, onInvite, onRemoveMember }: Props) {
  const { t } = useI18n();
  const id = activeId(state);
  const meta = convoMeta(state, id);
  if (!meta) return null;

  if (meta.kind === 'group') {
    return (
      <>
        <ul className="members">
          <li>
            <ProfileAvatar avatar={state.profile.avatar} size={32} label={state.profile.handle} />
            <span className="members__name">{state.profile.displayName}</span>
            <span className="members__tag">{t('info.you')}</span>
          </li>
          {meta.members.map((cid) => {
            const c = state.contacts[cid];
            if (!c) return null;
            return (
              <li key={cid}>
                <Identicon seed={cid} color={c.color} size={32} photo={c.avatar} />
                <span className="members__name">{nameOf(c)}</span>
                <span className={`members__tag ${c.verified ? '' : 'is-warn'}`}>{c.verified ? t('info.tagVerified') : t('info.tagUnverified')}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--tiny"
                  aria-label={t('info.removeMember', { name: nameOf(c) })}
                  title={t('info.removeMember', { name: nameOf(c) })}
                  onClick={() => onRemoveMember(cid)}
                >
                  <MinusCircleIcon size={16} />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn btn--dashed btn--block" onClick={onInvite}>
          <PlusIcon size={14} />
          {t('info.invite')}
        </button>
      </>
    );
  }

  const contact = state.contacts[contactOf(id)];
  if (!contact) return null;
  return (
    <>
      <div className="safety-grid">
        {contact.safety.map((g, i) => (
          <span key={i}>{g}</span>
        ))}
      </div>
      <p className="help">{t('info.safetyHelp', { name: nameOf(contact) })}</p>
      <button type="button" className="btn btn--outline btn--block" onClick={onVerify}>
        <ShieldIcon size={16} />
        {t('info.compare')}
      </button>
    </>
  );
}
