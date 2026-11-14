import type { Translate } from '../../i18n/index';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/index';
import type { MessageKey } from '../../i18n/en';
import { formatBytes, formatClock, formatRemaining } from '../../lib/time';
import { scramble } from '../../lib/visual';
import { usePrefs } from '../../state/prefs';
import { nameOf } from '../../state/chat';
import type { Contact, Message, ReplyRef } from '../../types';
import { REACTIONS } from '../../types';
import { CheckIcon, ClockIcon, CopyIcon, DoubleCheckIcon, DownloadIcon, FileLockIcon, ReplyIcon, SmileIcon, TrashIcon, WarnIcon } from '../ui/Icons';
import { Identicon } from '../ui/Identicon';

export function systemText(message: Message, t: Translate, contacts: Record<string, Contact>): string {
  const ev = message.system;
  if (!ev) return '';
  const p = ev.params ?? {};
  const who = (id: string) => (id === 'me' ? t('sys.you') : nameOf(contacts[id]) || id);
  return t(ev.key, {
    name: p.name ? who(p.name) : '',
    names: (p.names ?? []).map(who).join(', '),
    timer: p.timer ? t(`timer.${p.timer}` as MessageKey) : '',
    n: p.n ?? 0,
    group: p.group ?? '',
  });
}

/** Who wrote a quoted / reacting message, as shown in the UI. */
export function whoName(who: string, t: Translate, contacts: Record<string, Contact>): string {
  return who === 'me' ? t('list.you') : nameOf(contacts[who]) || who;
}

/** One-line summary of a quoted message. */
/** Recorded WebM has no length in its header; jumping to the end once makes the browser learn it. */
function VoicePlayer({ src }: { src: string }) {
  const fixLength = (a: HTMLAudioElement) => {
    if (a.duration !== Infinity) return;
    const reset = () => {
      a.removeEventListener('timeupdate', reset);
      a.currentTime = 0;
    };
    a.addEventListener('timeupdate', reset);
    a.currentTime = 1e101;
  };
  return <audio className="file-card__audio" controls preload="metadata" src={src} onLoadedMetadata={(e) => fixLength(e.currentTarget)} />;
}

export function replySummary(r: ReplyRef): string {
  return r.file ? `📎 ${r.file}${r.text ? ` · ${r.text}` : ''}` : r.text;
}

const touchOnly = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

interface Props {
  message: Message;
  tick: number;
  now: number;
  isGroup: boolean;
  showSender: boolean;
  privacyScreen: boolean;
  contacts: Record<string, Contact>;
  onCopy: (m: Message) => void;
  onDelete: (m: Message) => void;
  onSave: (m: Message) => void;
  onReply: (m: Message) => void;
  onReact: (mid: string, emoji: string) => void;
  onJump: (mid: string) => void;
}

function MessageItemImpl({ message: m, tick, now, isGroup, showSender, privacyScreen, contacts, onCopy, onDelete, onSave, onReply, onReact, onJump }: Props) {
  const { t, lang } = useI18n();
  const { prefs } = usePrefs();
  const [peek, setPeek] = useState(false);
  const [picking, setPicking] = useState(false); // emoji picker open
  const [active, setActive] = useState(false); // touch screens: tools shown after a tap
  const rootRef = useRef<HTMLDivElement>(null);
  const reactBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerPos, setPickerPos] = useState<{ left: number; top: number } | null>(null);

  /**
   * Puts the emoji picker exactly above the tools pill (centred on the react button), flips it below when the
   * message is near the top of the chat, and slides it sideways so it never leaves the visible thread.
   */
  const placePicker = useCallback(() => {
    const btn = reactBtnRef.current;
    const picker = pickerRef.current;
    const pill = btn?.closest('.msg__tools');
    if (!btn || !picker || !pill) return;
    const host = btn.closest('.thread')?.getBoundingClientRect();
    const bounds = host ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const margin = 8;
    const anchor = btn.getBoundingClientRect();
    const pillBox = pill.getBoundingClientRect();
    const w = picker.offsetWidth;
    const h = picker.offsetHeight;
    let left = anchor.left + anchor.width / 2 - w / 2;
    left = Math.max(bounds.left + margin, Math.min(left, bounds.right - margin - w));
    let top = pillBox.top - h - 6;
    if (top < bounds.top + margin) top = Math.min(pillBox.bottom + 6, bounds.bottom - margin - h);
    setPickerPos({ left: Math.round(left), top: Math.round(top) });
  }, []);

  useLayoutEffect(() => {
    if (!picking) {
      setPickerPos(null);
      return;
    }
    placePicker();
    const thread = reactBtnRef.current?.closest('.thread');
    thread?.addEventListener('scroll', placePicker, { passive: true });
    window.addEventListener('resize', placePicker);
    return () => {
      thread?.removeEventListener('scroll', placePicker);
      window.removeEventListener('resize', placePicker);
    };
  }, [picking, placePicker]);

  // Close the picker / tools on a tap elsewhere or Esc.
  useEffect(() => {
    if (!picking && !active) return;
    const away = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setPicking(false);
        setActive(false);
      }
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (setPicking(false), setActive(false));
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [picking, active]);

  if (m.from === 'system') {
    return (
      <div className="msg-system">
        <span>
          {systemText(m, t, contacts)} · {formatClock(m.at, lang, prefs.clock)}
        </span>
      </div>
    );
  }

  const decrypting = m.revealed < m.text.length;
  const hidden = privacyScreen && !peek && !decrypting;
  const plain = hidden ? '' : m.text.slice(0, m.revealed);
  const noise = hidden ? scramble(m.text, m.id) : decrypting ? scramble(m.text.slice(m.revealed), m.id + tick * 17) : '';
  const mine = m.from === 'me';
  const sender = m.who ? contacts[m.who] : undefined;
  const time = formatClock(m.at, lang, prefs.clock);
  const isImage = !!m.file?.dataUrl && m.file.type.startsWith('image/');
  const isAudio = !!m.file?.dataUrl && m.file.type.startsWith('audio/');

  const peekHandlers = privacyScreen
    ? { onMouseEnter: () => setPeek(true), onMouseLeave: () => setPeek(false), onFocus: () => setPeek(true), onBlur: () => setPeek(false) }
    : {};

  const canAnswer = !!m.mid && !decrypting;
  const quote = m.reply && (
    <button type="button" className="quote" title={t('msg.jump')} onClick={() => onJump(m.reply!.mid)}>
      <span className="quote__who">{whoName(m.reply.who, t, contacts)}</span>
      <span className="quote__text">{hidden ? scramble(replySummary(m.reply), m.id + 3) : replySummary(m.reply)}</span>
    </button>
  );

  // Reactions grouped by emoji, quick-reaction order first.
  const grouped = new Map<string, string[]>();
  for (const [who, emoji] of Object.entries(m.reactions ?? {})) grouped.set(emoji, [...(grouped.get(emoji) ?? []), who]);
  const order = (e: string) => {
    const i = (REACTIONS as readonly string[]).indexOf(e);
    return i < 0 ? REACTIONS.length : i;
  };
  const reactionList = [...grouped.entries()].sort((a, b) => order(a[0]) - order(b[0]));

  const body = m.file ? (
    <div className={`file-card ${hidden ? 'is-hidden' : ''}`} {...peekHandlers}>
      {quote}
      {isImage && !hidden && <img className="file-card__image" src={m.file.dataUrl} alt={m.file.name} />}
      {isAudio && !hidden && <VoicePlayer src={m.file.dataUrl!} />}
      <div className="file-card__top">
        <span className="file-card__icon">
          <FileLockIcon size={20} />
        </span>
        <span className="file-card__text">
          <span className="file-card__name">{hidden ? scramble(m.file.name, m.id) : m.file.type.startsWith('audio/') ? t('voice.label') : m.file.name}</span>
          <span className="file-card__meta">{formatBytes(m.file.size)}</span>
        </span>
      </div>
      <div className="file-card__sum">
        {t('file.checksum')}: {m.file.checksum.length > 24 ? `${m.file.checksum.slice(0, 12)}…${m.file.checksum.slice(-8)}` : m.file.checksum}
      </div>
      <button type="button" className="btn btn--outline" onClick={() => onSave(m)}>
        <DownloadIcon size={16} />
        {t('file.save')}
      </button>
      {m.text && <p className="file-card__caption">{hidden ? scramble(m.text, m.id) : m.text}</p>}
    </div>
  ) : (
    <div
      className={`bubble ${mine ? 'bubble--mine' : 'bubble--theirs'}`}
      {...peekHandlers}
      onClick={(e) => {
        if (touchOnly() && !(e.target as HTMLElement).closest('.quote')) setActive((a) => !a);
      }}
    >
      {quote}
      {/* The animated text is visual only; screen readers get the message once, in full. */}
      <span aria-hidden="true">
        {plain}
        {noise && <span className={`bubble__noise ${hidden ? 'is-hidden' : ''}`}>{noise}</span>}
      </span>
      <span className="sr-only">{hidden ? t('chat.privacyScreen') : m.text}</span>
    </div>
  );

  const remaining = m.expiresAt ? m.expiresAt - now : null;
  const timerLabel = remaining !== null ? formatRemaining(remaining, t) : m.timer && m.timer !== 'off' ? t(`timer.${m.timer}` as MessageKey) : null;

  const statusIcon =
    m.status === 'pending' ? (
      <ClockIcon size={13} />
    ) : m.status === 'failed' ? (
      <WarnIcon size={13} />
    ) : m.status === 'sent' ? (
      <CheckIcon size={14} />
    ) : (
      <DoubleCheckIcon size={16} />
    );

  return (
    <div ref={rootRef} className={`msg ${mine ? 'msg--mine' : 'msg--theirs'} ${active || picking ? 'is-active' : ''}`} data-mid={m.mid}>
      {isGroup && !mine && (
        <span className="msg__avatar">{showSender && sender && <Identicon seed={sender.id} color={sender.color} size={30} photo={sender.avatar} />}</span>
      )}
      <div className="msg__col">
        {isGroup && !mine && showSender && (
          <span className="msg__sender" style={{ color: sender ? `color-mix(in srgb, ${sender.color} 68%, var(--ink))` : undefined }}>
            {sender ? nameOf(sender) : '?'}
          </span>
        )}
        <div className="msg__line">
          {body}
          <div className="msg__tools" role="group" aria-label={time}>
            {canAnswer && (
              <>
                <button
                  type="button"
                  className="icon-btn icon-btn--tiny"
                  aria-label={t('msg.reply')}
                  title={t('msg.reply')}
                  onClick={() => {
                    setActive(false);
                    onReply(m);
                  }}
                >
                  <ReplyIcon size={15} />
                </button>
                <button
                  ref={reactBtnRef}
                  type="button"
                  className="icon-btn icon-btn--tiny"
                  aria-label={t('msg.react')}
                  title={t('msg.react')}
                  aria-expanded={picking}
                  onClick={() => setPicking((p) => !p)}
                >
                  <SmileIcon size={15} />
                </button>
              </>
            )}
            {!m.file && m.text && (
              <button type="button" className="icon-btn icon-btn--tiny" aria-label={t('msg.copy')} title={t('msg.copy')} onClick={() => onCopy(m)}>
                <CopyIcon size={14} />
              </button>
            )}
            <button type="button" className="icon-btn icon-btn--tiny" aria-label={t('msg.delete')} title={t('msg.delete')} onClick={() => onDelete(m)}>
              <TrashIcon size={14} />
            </button>
          </div>
          {picking && (
            <div
              ref={pickerRef}
              className="react-picker"
              role="menu"
              aria-label={t('msg.react')}
              style={pickerPos ?? { left: 0, top: 0, visibility: 'hidden' }}
            >
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="menuitemradio"
                  aria-checked={m.reactions?.me === e}
                  className={`react-picker__item ${m.reactions?.me === e ? 'is-mine' : ''}`}
                  onClick={() => {
                    setPicking(false);
                    setActive(false);
                    onReact(m.mid!, e);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        {reactionList.length > 0 && (
          <div className="reactions">
            {reactionList.map(([emoji, whos]) => {
              const byMe = whos.includes('me');
              const names = whos.map((w) => whoName(w, t, contacts)).join(', ');
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`reaction ${byMe ? 'is-mine' : ''}`}
                  aria-pressed={byMe}
                  title={names}
                  aria-label={t('msg.reactedBy', { emoji, names })}
                  disabled={!m.mid}
                  onClick={() => m.mid && onReact(m.mid, emoji)}
                >
                  <span className="reaction__emoji">{emoji}</span>
                  {whos.length > 1 && <span className="reaction__count">{whos.length}</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="meta">
          {timerLabel && (
            <span className="meta__timer" title={remaining !== null ? t('msg.expiresIn', { v: timerLabel }) : undefined}>
              <ClockIcon size={12} />
              {timerLabel}
            </span>
          )}
          <span>{time}</span>
          {decrypting && <span className="meta__status">{mine ? t('msg.encrypting') : t('msg.decrypting')}</span>}
          {mine && !decrypting && m.status && (
            <span className={`meta__check meta__check--${m.status}`} title={t(`msg.${m.status}` as MessageKey)}>
              {statusIcon}
              <span className="sr-only">{t(`msg.${m.status}` as MessageKey)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemImpl);
