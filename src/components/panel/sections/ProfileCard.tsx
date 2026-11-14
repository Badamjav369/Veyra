import type { Dispatch, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useToast } from '../../../lib/toast';
import type { ChatAction } from '../../../state/chat';
import { activeId, convoMeta } from '../../../state/chat';
import type { ChatState } from '../../../types';
import { PALETTE } from '../../../types';
import { ColorPicker } from '../../ui/controls';
import { EditIcon, ShieldIcon, WarnIcon } from '../../ui/Icons';
import { Identicon } from '../../ui/Identicon';

interface Props {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  onSaveGroup: (name: string, description: string, color: string) => void;
}

/** Who this conversation is with: avatar, name, trust status — and the form to rename or recolour it. */
export function ProfileCard({ state, dispatch, onSaveGroup }: Props) {
  const { t } = useI18n();
  const notify = useToast();
  const id = activeId(state);
  const meta = convoMeta(state, id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => setEditing(false), [id]);
  if (!meta) return null;

  const isGroup = meta.kind === 'group';
  const contact = isGroup ? undefined : state.contacts[meta.seed];

  const startEdit = () => {
    setName(isGroup ? meta.name : contact?.nickname ?? '');
    setDescription(isGroup && meta.description ? meta.description : '');
    setColor(meta.color);
    setEditing(true);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (isGroup) {
      const clean = name.trim().replace(/^#+/, '').replace(/\s+/g, '-').slice(0, 32);
      if (!clean) return;
      onSaveGroup(clean, description.trim(), color);
    } else if (contact) {
      dispatch({ type: 'updateContact', id: contact.id, nickname: name, color });
    }
    setEditing(false);
    notify(t('info.saved'));
  };

  if (editing) {
    return (
      <form className="form edit-card" onSubmit={save}>
        <div className="form__row">
          <label htmlFor="ed-name" className="label">
            {isGroup ? t('info.groupName') : t('info.nickname')}
          </label>
          <div className="field">
            <span className="field__prefix" aria-hidden="true">
              {isGroup ? '#' : ''}
            </span>
            <input id="ed-name" value={name} maxLength={32} placeholder={isGroup ? '' : t('info.nicknamePh')} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
        </div>
        {isGroup && (
          <div className="form__row">
            <label htmlFor="ed-desc" className="label">
              {t('info.description')}
            </label>
            <textarea id="ed-desc" className="textarea" rows={2} maxLength={120} value={description} placeholder={t('info.descriptionPh')} onChange={(e) => setDescription(e.target.value)} />
          </div>
        )}
        <div className="form__row">
          <span className="label">{t('info.color')}</span>
          <ColorPicker label={t('info.color')} value={color} colors={PALETTE} onChange={setColor} />
        </div>
        <div className="form__actions">
          <button type="button" className="btn btn--outline btn--small" onClick={() => setEditing(false)}>
            {t('info.cancel')}
          </button>
          <button type="submit" className="btn btn--primary btn--small">
            {t('info.save')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="profile">
      <Identicon seed={meta.seed} color={meta.color} size={64} shape={isGroup ? 'square' : 'circle'} photo={isGroup ? undefined : contact?.avatar} />
      <div className="profile__text">
        <div className="profile__name">
          <span className="sigil">
            {isGroup ? '#' : '@'}
          </span>
          {meta.name}
        </div>
        {meta.description && <p className="profile__desc">{meta.description}</p>}
        {meta.verified ? (
          <span className="pill pill--ok">
            <ShieldIcon size={13} />
            {t('chat.verified')}
          </span>
        ) : (
          <span className="pill pill--warn">
            <WarnIcon size={13} />
            {isGroup ? t('chat.groupSubUnverified', { n: meta.members.length + 1, u: meta.unverifiedCount }) : t('chat.unverifiedIcon')}
          </span>
        )}
      </div>
      <button type="button" className="icon-btn" aria-label={t('info.edit')} title={t('info.edit')} onClick={startEdit}>
        <EditIcon size={17} />
      </button>
    </div>
  );
}
