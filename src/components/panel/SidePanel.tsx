import type { Dispatch, ReactNode } from 'react';
import { useI18n } from '../../i18n/index';
import type { MessageKey } from '../../i18n/en';
import type { ChatAction } from '../../state/chat';
import { activeId, convoMeta } from '../../state/chat';
import { usePrefs } from '../../state/prefs';
import type { ChatState } from '../../types';
import { ClockIcon, CogIcon, EyeIcon, KeyIcon, LockIcon, PaletteIcon, RefreshIcon, ShieldCheckIcon, TrashIcon, UsersIcon } from '../ui/Icons';
import { Accordion } from './Accordion';
import { PanelHandle } from './PanelHandle';
import { AccountRemovalSection } from './sections/AccountRemovalSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { ChatActionsSection } from './sections/ChatActionsSection';
import { EncryptionSection } from './sections/EncryptionSection';
import { GeneralSection } from './sections/GeneralSection';
import { PrivacySection } from './sections/PrivacySection';
import { ProfileCard } from './sections/ProfileCard';
import { SecuritySection } from './sections/SecuritySection';
import { TimerSection } from './sections/TimerSection';
import { TrustSection } from './sections/TrustSection';

export type SectionId = 'trust' | 'encryption' | 'timer' | 'actions' | 'security' | 'privacy' | 'appearance' | 'general' | 'remove';

interface Props {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  /** The section that is expanded (null = all collapsed). */
  openSection: SectionId | null;
  onOpenSection: (id: SectionId | null) => void;
  onClose: () => void;
  // conversation
  onVerify: () => void;
  onInvite: () => void;
  onConfirm: (action: 'leave' | 'delete' | 'clear') => void;
  onRotate: () => void;
  onRemoveMember: (handle: string) => void;
  onSaveGroup: (name: string, description: string, color: string) => void;
  // account
  onChangePassphrase: (current: string, next: string) => Promise<'ok' | 'wrong' | 'offline'>;
  recoveryAt?: number;
  onRecovery: () => void;
  onVerifyPassword: (password: string) => Promise<boolean>;
  onErase: () => void;
}

interface Item {
  id: SectionId;
  icon: ReactNode;
  title: string;
  summary: string;
  tone?: 'warn' | 'danger';
  body: ReactNode;
}

/**
 * The right-hand panel: one list, most important first (the order is the ranking — rows carry icons, not numbers). What matters for the open conversation
 * (who you are talking to, how it is protected, how long it lives) comes first; your account and
 * app settings follow, with the one irreversible thing — deleting the account — always last.
 */
export function SidePanel(p: Props) {
  const { t } = useI18n();
  const { prefs, theme } = usePrefs();
  const { state } = p;
  const meta = convoMeta(state, activeId(state));

  const chatItems: Item[] = [];
  if (meta) {
    const isGroup = meta.kind === 'group';
    const timer = state.timers[activeId(state)] ?? 'off';
    chatItems.push(
      {
        id: 'trust',
        icon: isGroup ? <UsersIcon size={20} /> : <ShieldCheckIcon size={20} />,
        title: isGroup ? t('sec.members') : t('sec.verify'),
        summary: isGroup
          ? meta.unverifiedCount
            ? t('sum.groupUnverified', { n: meta.members.length + 1, u: meta.unverifiedCount })
            : t('sum.groupVerified', { n: meta.members.length + 1 })
          : meta.verified
            ? t('sum.verified')
            : t('sum.unverified'),
        tone: meta.verified ? undefined : 'warn',
        body: <TrustSection state={state} onVerify={p.onVerify} onInvite={p.onInvite} onRemoveMember={p.onRemoveMember} />,
      },
      {
        id: 'encryption',
        icon: <LockIcon size={20} />,
        title: t('info.encryption'),
        summary: isGroup ? t('sum.epoch', { n: meta.epoch }) : t('info.protocolDirect'),
        body: <EncryptionSection state={state} />,
      },
      {
        id: 'timer',
        icon: <ClockIcon size={20} />,
        title: t('info.disappearing'),
        summary: timer === 'off' ? t('timer.off') : t('sum.timerOn', { v: t(`timer.${timer}` as MessageKey) }),
        body: <TimerSection state={state} dispatch={p.dispatch} />,
      },
      {
        id: 'actions',
        icon: <RefreshIcon size={20} />,
        title: t('sec.actions'),
        summary: isGroup ? t('sum.actionsGroup') : t('sum.actionsDirect'),
        body: <ChatActionsSection state={state} onRotate={p.onRotate} onConfirm={p.onConfirm} />,
      },
    );
  }

  const privacyOn = Object.values({ a: state.toggles.hideOnBlur, b: state.toggles.receipts, c: state.toggles.typing }).filter(Boolean).length;
  const appItems: Item[] = [
    {
      id: 'security',
      icon: <KeyIcon size={20} />,
      title: t('sec.security'),
      summary: p.recoveryAt ? t('sum.lock', { v: t(`lock.${prefs.autoLock}`) }) : t('sum.noRecovery'),
      tone: p.recoveryAt ? undefined : 'warn',
      body: <SecuritySection onChangePassphrase={p.onChangePassphrase} recoveryAt={p.recoveryAt} onRecovery={p.onRecovery} />,
    },
    {
      id: 'privacy',
      icon: <EyeIcon size={20} />,
      title: t('info.privacy'),
      summary: t('sum.privacy', { n: privacyOn }),
      body: <PrivacySection state={state} dispatch={p.dispatch} />,
    },
    {
      id: 'appearance',
      icon: <PaletteIcon size={20} />,
      title: t('sec.appearance'),
      summary: `${t(`theme.${theme}` as MessageKey)}${prefs.theme === 'system' ? ` (${t('theme.auto')})` : ''} · ${t(`size.${prefs.textSize}` as MessageKey)}`,
      body: <AppearanceSection />,
    },
    {
      id: 'general',
      icon: <CogIcon size={20} />,
      title: t('sec.general'),
      summary: `${t(`clock.${prefs.clock}` as MessageKey)} · ${prefs.enterToSend ? t('sum.enterSends') : t('sum.ctrlEnterSends')}`,
      body: <GeneralSection />,
    },
    {
      id: 'remove',
      icon: <TrashIcon size={20} />,
      title: t('sec.remove'),
      summary: t('sum.remove'),
      tone: 'danger',
      body: <AccountRemovalSection onVerifyPassword={p.onVerifyPassword} onErase={p.onErase} />,
    },
  ];

  const render = (item: Item) => {
    return (
      <Accordion key={item.id} id={item.id} icon={item.icon} title={item.title} summary={item.summary} tone={item.tone} open={p.openSection === item.id} onToggle={() => p.onOpenSection(p.openSection === item.id ? null : item.id)}>
        {item.body}
      </Accordion>
    );
  };

  return (
    <aside className="side" id="side-panel" aria-labelledby="side-title">
      <PanelHandle open onToggle={p.onClose} />
      <header className="side__header">
        <div>
          <h2 id="side-title">{t('panel.title')}</h2>
          <p>{t('panel.hint')}</p>
        </div>
      </header>

      <div className="side__body">
        {meta && <ProfileCard state={state} dispatch={p.dispatch} onSaveGroup={p.onSaveGroup} />}

        {meta && (
          <section aria-labelledby="grp-chat">
            <h4 className="side__group" id="grp-chat">
              {t('panel.groupChat')}
            </h4>
            <ol className="acc-list">{chatItems.map(render)}</ol>
          </section>
        )}

        <section aria-labelledby="grp-app">
          <h4 className="side__group" id="grp-app">
            {t('panel.groupApp')}
          </h4>
          <ol className="acc-list">{appItems.map(render)}</ol>
        </section>
      </div>
    </aside>
  );
}
