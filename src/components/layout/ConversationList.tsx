import type { Dispatch } from 'react';
import type { ChatAction } from '../../state/chat';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/index';
import { formatListTime } from '../../lib/time';
import { scramble } from '../../lib/visual';
import { usePrefs } from '../../state/prefs';
import type { MessageKey } from '../../i18n/en';
import { activeId, convoMeta, nameOf } from '../../state/chat';
import type { ChatState } from '../../types';
import type { NetState } from '../../App';
import { EyeIcon, EyeOffIcon, GroupPlusIcon, MoonIcon, SearchIcon, SunIcon, UserPlusIcon, WarnIcon } from '../ui/Icons';
import { Identicon, ProfileAvatar } from '../ui/Identicon';
import { Logo } from '../ui/Logo';

interface Props {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  net: NetState;
  onOpen: (id: string) => void;
  onNewGroup: () => void;
  onAddContact: () => void;
  onProfile: () => void;
}

export function ConversationList({ state, dispatch, net, onOpen, onNewGroup, onAddContact, onProfile }: Props) {
  const { t, lang } = useI18n();
  const { prefs, theme, setPrefs } = usePrefs();
  const [query, setQuery] = useState('');
  const current = activeId(state);
  const isDirect = state.section === 'direct';

  const directIds = state.directIds.map((p) => `d:${p}`);
  const groupIds = state.groups.map((g) => g.id);
  const ids = isDirect ? directIds : groupIds;

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ids
      .map((id) => {
        const meta = convoMeta(state, id);
        if (!meta) return null;
        const thread = state.threads[id] ?? [];
        const last = [...thread].reverse().find((m) => m.from !== 'system');
        let preview = '';
        if (last) {
          if (last.file) preview = last.file.type.startsWith('audio/') ? t('voice.label') : `${t('list.file')} · ${last.file.name}`;
          else if (last.from === 'me') preview = `${t('list.you')}: ${last.text}`;
          else if (meta.kind === 'group' && last.who) preview = `${nameOf(state.contacts[last.who]) || '?'}: ${last.text}`;
          else preview = last.text;
        }
        const handle = meta.kind === 'direct' ? state.contacts[meta.seed]?.handle ?? '' : '';
        return { id, meta, preview, handle, at: last?.at ?? thread[thread.length - 1]?.at ?? 0 };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .filter((item) => !q || item.meta.name.toLowerCase().includes(q) || item.handle.includes(q));
  }, [ids, query, state, t]);

  const unreadIn = (list: string[]) => list.reduce((sum, id) => sum + (id === current ? 0 : state.unread[id] ?? 0), 0);
  const counts = { direct: unreadIn(directIds), group: unreadIn(groupIds) };
  const profile = state.profile;
  const netKey = net.error && net.error !== 'replaced' ? 'error' : net.status;
  const netText = t(`net.s.${netKey}` as MessageKey);

  return (
    <aside className="sidebar" aria-label={t('search.label')}>
      <header className="sidebar__head">
        <Logo size={34} />
        <span className="sidebar__spacer" />
        <button
          type="button"
          className="icon-btn icon-btn--round"
          aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
          title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
          onClick={() => setPrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}
        >
          {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </button>
      </header>

      <div className="pill-tabs" role="group" aria-label={t('tabs.label')}>
        {(['direct', 'group'] as const).map((sec) => (
          <button key={sec} type="button" className="pill-tabs__item" aria-pressed={state.section === sec} onClick={() => dispatch({ type: 'section', section: sec })}>
            {sec === 'direct' ? t('tabs.direct') : t('tabs.groups')}
            {counts[sec] > 0 && (
              <span className="pill-tabs__badge" aria-label={t('list.unread', { n: counts[sec] })}>
                {counts[sec] > 99 ? '99+' : counts[sec]}
              </span>
            )}
          </button>
        ))}
      </div>

      <button type="button" className="new-chat-btn" onClick={isDirect ? onAddContact : onNewGroup}>
        {isDirect ? <UserPlusIcon size={20} /> : <GroupPlusIcon size={20} />}
        {isDirect ? t('list.addContact') : t('list.newGroup')}
      </button>

      <div className="sidebar__search">
        <label htmlFor="search" className="sr-only">
          {t('search.label')}
        </label>
        <div className="field field--pill">
          <SearchIcon size={18} />
          <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search.placeholder')} autoComplete="off" />
          {isDirect && (
            <button
              type="button"
              className="icon-btn icon-btn--small"
              aria-pressed={state.hidePreviews}
              aria-label={state.hidePreviews ? t('list.showPreviews') : t('list.hidePreviews')}
              title={state.hidePreviews ? t('list.showPreviews') : t('list.hidePreviews')}
              onClick={() => dispatch({ type: 'hidePreviews' })}
            >
              {state.hidePreviews ? <EyeIcon size={17} /> : <EyeOffIcon size={17} />}
            </button>
          )}
        </div>
      </div>

      <nav className="convo-list" aria-label={isDirect ? t('tabs.direct') : t('tabs.groups')}>
        {ids.length === 0 && (
          <p className="convo-list__empty">{isDirect ? t('list.noDirect') : t('list.noGroups')}</p>
        )}
        {ids.length > 0 && items.length === 0 && <p className="convo-list__empty">{t('list.empty')}</p>}
        {items.map(({ id, meta, preview, at }) => {
          const isActive = id === current;
          const unread = isActive ? 0 : state.unread[id] ?? 0;
          const shown = state.hidePreviews ? scramble(preview, id.length * 31 + 7) : preview;
          return (
            <button key={id} type="button" className="convo" aria-current={isActive ? 'true' : undefined} onClick={() => onOpen(id)}>
              <Identicon seed={meta.seed} color={meta.color} size={48} shape={meta.kind === 'group' ? 'square' : 'circle'} photo={meta.kind === 'group' ? undefined : state.contacts[meta.seed]?.avatar} />
              <span className="convo__body">
                <span className="convo__row">
                  <span className="convo__name">
                    <span className="convo__handle">
                      <span className="sigil">
                        {meta.kind === 'group' ? '#' : '@'}
                      </span>
                      {meta.name}
                    </span>
                    {!meta.verified && (
                      <span className="warn-icon" title={t('chat.unverifiedIcon')}>
                        <WarnIcon size={12} />
                      </span>
                    )}
                  </span>
                  <span className="convo__time">{at ? formatListTime(at, lang, t, prefs.clock) : ''}</span>
                </span>
                <span className="convo__row">
                  <span className={`convo__preview ${state.hidePreviews ? 'is-masked' : ''}`}>
                    {meta.kind === 'group' && (
                      <span className="convo__members">
                        {t('list.members', { n: meta.members.length + 1 })}
                        {shown ? ' · ' : ''}
                      </span>
                    )}
                    {shown}
                  </span>
                  {unread > 0 && (
                    <span className="badge" aria-label={t('list.unread', { n: unread })}>
                      {unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <footer className="me-bar">
        <button type="button" className="me-bar__who" aria-label={t('me.profile')} title={t('me.profile')} onClick={onProfile}>
          <span className="me-bar__avatar">
            <ProfileAvatar avatar={profile.avatar} size={44} label={profile.handle} />
            <span className={`presence-dot presence-dot--${profile.presence}`} aria-hidden="true" />
          </span>
          <span className="me-bar__text">
            <strong>{profile.displayName || profile.handle}</strong>
            <span className={`me-bar__status me-bar__status--${netKey}`}>{t('me.status', { presence: t(`presence.${profile.presence}` as MessageKey), net: netText })}</span>
          </span>
        </button>
      </footer>
    </aside>
  );
}
