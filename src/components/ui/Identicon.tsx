import { luminance, mix } from '../../state/prefs';
import type { Avatar } from '../../types';

interface Props {
  seed: string;
  color: string;
  size?: number;
  shape?: 'circle' | 'square';
  /** Text the initial comes from (a handle or name). Without it a square avatar shows "#" (a group). */
  label?: string;
  photo?: string;
}

/** Colours saved by older versions can be dark; lift them to a pastel so the dark initial stays readable. */
function pastel(color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  let out = color;
  for (let i = 0; i < 8 && luminance(out) < 0.5; i++) out = mix(out, 0.2, '#ffffff');
  return out;
}

/** First letter or digit, upper-cased; "#" when there is nothing to show. */
function initial(text: string | undefined): string {
  const m = text && /[\p{L}\p{N}]/u.exec(text);
  return m ? m[0].toUpperCase() : '#';
}

/** A pastel disc with an initial (or "#" for groups). Nothing about the contact leaves the device. */
export function Identicon({ seed, color, size = 40, shape = 'circle', label, photo }: Props) {
  // A photo the contact shared with us (only image data URLs are shown).
  if (photo && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(photo)) {
    return (
      <span className={`identicon identicon--${shape} identicon--photo`} style={{ width: size, height: size }} aria-hidden="true">
        <img src={photo} alt="" width={size} height={size} />
      </span>
    );
  }
  const glyph = label !== undefined ? initial(label) : shape === 'square' ? '#' : initial(seed);
  return (
    <span className={`identicon identicon--${shape}`} style={{ width: size, height: size, background: pastel(color), fontSize: Math.round(size * 0.4) }} aria-hidden="true">
      {glyph}
    </span>
  );
}

/** Your own avatar: a photo if you uploaded one, otherwise your initial. */
export function ProfileAvatar({ avatar, size = 40, label }: { avatar: Avatar; size?: number; label?: string }) {
  if (avatar.kind === 'image') {
    return (
      <span className="identicon identicon--circle identicon--photo" style={{ width: size, height: size }} aria-hidden="true">
        <img src={avatar.dataUrl} alt="" width={size} height={size} />
      </span>
    );
  }
  return <Identicon seed={avatar.seed} color={avatar.color} size={size} label={label ?? ''} />;
}
