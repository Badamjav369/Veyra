import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/index';
import { VOICE_BARS, type VoiceClip, type useVoiceRecorder } from '../../lib/useVoiceRecorder';
import { CloseIcon, PauseIcon, PlayIcon, SendIcon, StopIcon, TrashIcon } from '../ui/Icons';

type Voice = ReturnType<typeof useVoiceRecorder>;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

function Wave({ bars, played = bars.length }: { bars: number[]; played?: number }) {
  return (
    <span className="voice-wave" aria-hidden="true">
      {bars.map((v, i) => (
        <i key={i} className={i < played ? 'is-on' : ''} style={{ height: `${Math.round(14 + v * 86)}%` }} />
      ))}
    </span>
  );
}

/** Live level meter while recording. Re-renders itself; the chat around it stays still. */
function Meter({ live }: { live: Voice['live'] }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 70);
    return () => window.clearInterval(id);
  }, []);
  const { seconds, levels } = live.current;
  const bars = [...Array<number>(Math.max(0, VOICE_BARS - levels.length)).fill(0), ...levels];
  return (
    <div className="voice-rec" role="status">
      <span className="voice-rec__dot" aria-hidden="true" />
      <span className="voice-rec__time">{clock(seconds)}</span>
      <Wave bars={bars} />
    </div>
  );
}

/** Listen back to the recording before sending it. */
function Preview({ clip }: { clip: VoiceClip }) {
  const { t } = useI18n();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const a = new Audio(clip.url);
    audio.current = a;
    a.ontimeupdate = () => setTime(Math.min(a.currentTime, clip.seconds));
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.onended = () => {
      setPlaying(false);
      setTime(0);
    };
    return () => {
      a.pause();
      a.removeAttribute('src');
    };
  }, [clip]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  return (
    <div className="voice-rec">
      <button type="button" className="icon-btn" aria-label={t(playing ? 'voice.pause' : 'voice.play')} title={t(playing ? 'voice.pause' : 'voice.play')} onClick={toggle}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <Wave bars={clip.bars} played={Math.round((time / clip.seconds) * clip.bars.length)} />
      <span className="voice-rec__time">{clock(playing || time > 0 ? time : clip.seconds)}</span>
    </div>
  );
}

/** Replaces the composer's controls while a voice message is being recorded or reviewed. */
export function VoiceBar({ voice, onSend }: { voice: Voice; onSend: (file: File) => void }) {
  const { t } = useI18n();
  if (voice.phase === 'recording') {
    return (
      <>
        <button type="button" className="icon-btn" aria-label={t('voice.cancel')} title={t('voice.cancel')} onClick={voice.discard}>
          <CloseIcon />
        </button>
        <Meter live={voice.live} />
        <button type="button" className="send-btn" aria-label={t('voice.stop')} title={t('voice.stop')} onClick={voice.finish}>
          <StopIcon />
        </button>
      </>
    );
  }
  const clip = voice.clip;
  if (!clip) return null;
  return (
    <>
      <button type="button" className="icon-btn" aria-label={t('voice.discard')} title={t('voice.discard')} onClick={voice.discard}>
        <TrashIcon />
      </button>
      <Preview clip={clip} />
      <button
        type="button"
        className="send-btn"
        aria-label={t('voice.send')}
        title={t('voice.send')}
        onClick={() => {
          onSend(clip.file);
          voice.discard();
        }}
      >
        <SendIcon />
      </button>
    </>
  );
}
