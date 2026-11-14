import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_VOICE_SECONDS = 120; // ~24 kbit/s keeps two minutes well under the file size limit
export const VOICE_BARS = 40;

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export interface VoiceClip {
  file: File;
  url: string; // object URL for the preview player
  bars: number[]; // waveform, VOICE_BARS values 0..1
  seconds: number;
}

export interface VoiceLive {
  seconds: number;
  levels: number[]; // the most recent VOICE_BARS volume readings, 0..1
}

interface Active {
  mr: MediaRecorder;
  stream: MediaStream;
  ctx: AudioContext;
  chunks: Blob[];
  levels: number[];
  startedAt: number;
  timer: number;
  keep: boolean;
}

function downsample(levels: number[], n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const from = Math.floor((i * levels.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / n));
    let max = 0;
    for (let j = from; j < to && j < levels.length; j++) max = Math.max(max, levels[j]);
    return max;
  });
}

/**
 * Records from the microphone: idle → recording → review (listen back) → the caller sends or discards.
 * `live` is a ref that is updated about 14 times a second while recording, so only the small meter
 * component needs to re-render, not the whole chat.
 */
export function useVoiceRecorder(onError: (kind: 'denied' | 'unsupported') => void) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review'>('idle');
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const live = useRef<VoiceLive>({ seconds: 0, levels: [] });
  const active = useRef<Active | null>(null);
  const starting = useRef(false);
  const clipRef = useRef<VoiceClip | null>(null);
  const onErr = useRef(onError);
  useEffect(() => {
    onErr.current = onError;
  });

  const dropClip = useCallback(() => {
    if (clipRef.current) URL.revokeObjectURL(clipRef.current.url);
    clipRef.current = null;
    setClip(null);
  }, []);

  const stop = useCallback((keep: boolean) => {
    const r = active.current;
    if (!r) return;
    r.keep = keep;
    if (r.mr.state !== 'inactive') r.mr.stop();
  }, []);

  const start = useCallback(async () => {
    if (active.current || starting.current) return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return onErr.current('unsupported');
    starting.current = true;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      starting.current = false;
      return onErr.current('denied');
    }
    starting.current = false;
    dropClip();

    const mime = MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
    const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24_000 });
    const ctx = new AudioContext();
    void ctx.resume();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    const levels: number[] = [];
    const startedAt = Date.now();
    live.current = { seconds: 0, levels: [] };
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) {
        const d = (v - 128) / 128;
        sum += d * d;
      }
      levels.push(Math.min(1, Math.sqrt(sum / buf.length) * 5));
      const seconds = (Date.now() - startedAt) / 1000;
      live.current = { seconds, levels: levels.slice(-VOICE_BARS) };
      if (seconds >= MAX_VOICE_SECONDS) stop(true);
    }, 70);

    const r: Active = { mr, stream, ctx, chunks: [], levels, startedAt, timer, keep: false };
    active.current = r;
    mr.ondataavailable = (e) => {
      if (e.data.size) r.chunks.push(e.data);
    };
    mr.onstop = () => {
      window.clearInterval(r.timer);
      r.stream.getTracks().forEach((t) => t.stop());
      void r.ctx.close();
      active.current = null;
      const type = (mr.mimeType || mime || 'audio/webm').split(';')[0];
      const blob = new Blob(r.chunks, { type });
      if (r.keep && blob.size > 0) {
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const c: VoiceClip = {
          file: new File([blob], `voice-${Date.now()}.${ext}`, { type }),
          url: URL.createObjectURL(blob),
          bars: downsample(r.levels, VOICE_BARS),
          seconds: Math.max(0.1, (Date.now() - r.startedAt) / 1000),
        };
        clipRef.current = c;
        setClip(c);
        setPhase('review');
      } else {
        setPhase('idle');
      }
    };
    mr.start();
    setPhase('recording');
  }, [stop, dropClip]);

  /** Stops recording and moves to review. */
  const finish = useCallback(() => stop(true), [stop]);

  /** Throws the recording (or the clip under review) away. */
  const discard = useCallback(() => {
    stop(false);
    dropClip();
    setPhase('idle');
  }, [stop, dropClip]);

  useEffect(
    () => () => {
      stop(false);
      if (clipRef.current) URL.revokeObjectURL(clipRef.current.url);
    },
    [stop],
  );

  return { phase, clip, live, start, finish, discard };
}
