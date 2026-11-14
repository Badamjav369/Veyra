import { useI18n } from '../../../i18n/index';
import type { MessageKey } from '../../../i18n/en';
import type { Prefs, ThemeChoice } from '../../../state/prefs';
import { ACCENT_PRESETS, usePrefs } from '../../../state/prefs';
import { ColorPicker, Segmented } from '../../ui/controls';
import { MonitorIcon, MoonIcon, SunIcon } from '../../ui/Icons';
import { Field } from '../Field';

const THEME_ICON = { system: MonitorIcon, light: SunIcon, dark: MoonIcon } as const;

/** Theme (light / dark / follow the system), accent colour, text size, bubble shape and spacing. */
export function AppearanceSection() {
  const { t } = useI18n();
  const { prefs, setPrefs } = usePrefs();
  return (
    <>
      <Field label={t('settings.theme')}>
        <Segmented<ThemeChoice>
          label={t('settings.theme')}
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
          options={(['light', 'dark', 'system'] as const).map((v) => {
            const Icon = THEME_ICON[v];
            return {
              value: v,
              label: (
                <span className="shape-option">
                  <Icon size={15} />
                  {t(`theme.${v}`)}
                </span>
              ),
            };
          })}
        />
      </Field>
      <Field label={t('settings.accent')}>
        <ColorPicker
          label={t('settings.accent')}
          value={prefs.accent}
          colors={ACCENT_PRESETS.map((a) => a.hex)}
          names={ACCENT_PRESETS.map((a) => t(`accent.${a.id}` as MessageKey))}
          customLabel={t('settings.custom')}
          onChange={(accent) => setPrefs({ accent })}
        />
      </Field>
      <Field label={t('settings.textSize')}>
        <Segmented<Prefs['textSize']>
          label={t('settings.textSize')}
          value={prefs.textSize}
          onChange={(textSize) => setPrefs({ textSize })}
          options={(['sm', 'md', 'lg'] as const).map((v) => ({ value: v, label: t(`size.${v}`) }))}
        />
      </Field>
      <Field label={t('settings.bubbles')}>
        <Segmented<Prefs['bubbles']>
          label={t('settings.bubbles')}
          value={prefs.bubbles}
          onChange={(bubbles) => setPrefs({ bubbles })}
          options={(['round', 'soft', 'square'] as const).map((v) => ({
            value: v,
            label: (
              <span className="shape-option">
                <i className={`shape-sample shape-sample--${v}`} aria-hidden="true" />
                {t(`bubbles.${v}`)}
              </span>
            ),
          }))}
        />
      </Field>
      <Field label={t('settings.density')}>
        <Segmented<Prefs['density']>
          label={t('settings.density')}
          value={prefs.density}
          onChange={(density) => setPrefs({ density })}
          options={(['comfy', 'compact'] as const).map((v) => ({ value: v, label: t(`density.${v}`) }))}
        />
      </Field>
    </>
  );
}
