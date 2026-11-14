import type { Dispatch } from 'react';
import { useI18n } from '../../i18n/index';
import { activeId, type ChatAction } from '../../state/chat';
import type { ChatState } from '../../types';
import { ChatIcon, SettingsIcon, UsersIcon } from '../ui/Icons';
import { ProfileAvatar } from '../ui/Identicon';

interface Props {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  onSettings: () => void;
  onProfile: () => void;
}

/** Phones only: the bottom bar of the conversation list — Chats, Groups, Settings and Me. */
export function MobileNav({ state, dispatch, onSettings, onProfile }: Props) {
  const { t } = useI18n();
  const current = activeId(state);
  const unreadIn = (ids: string[]) => ids.reduce((sum, id) => sum + (id === current ? 0 : state.unread[id] ?? 0), 0);
  const counts = {
    direct: unreadIn(state.directIds.map((p) => `d:${p}`)),
    group: unreadIn(state.groups.map((g) => g.id)),
  };

  return (
    <nav className="mobile-nav" aria-label={t('nav.label')}>
      {(['direct', 'group'] as const).map((sec) => {
        const label = sec === 'direct' ? t('tabs.direct') : t('tabs.groups');
        return (
          <button key={sec} type="button" className="mobile-nav__item" aria-pressed={state.section === sec} onClick={() => dispatch({ type: 'section', section: sec })}>
            <span className="mobile-nav__icon">
              {sec === 'direct' ? <ChatIcon size={22} /> : <UsersIcon size={22} />}
              {counts[sec] > 0 && <span className="mobile-nav__badge">{counts[sec] > 99 ? '99+' : counts[sec]}</span>}
            </span>
            {label}
          </button>
        );
      })}
      <button type="button" className="mobile-nav__item" onClick={onSettings}>
        <span className="mobile-nav__icon">
          <SettingsIcon size={22} />
        </span>
        {t('me.settings')}
      </button>
      <button type="button" className="mobile-nav__item" onClick={onProfile}>
        <span className="mobile-nav__icon">
          <ProfileAvatar avatar={state.profile.avatar} size={26} label={state.profile.handle} />
        </span>
        {t('nav.me')}
      </button>
    </nav>
  );
}
