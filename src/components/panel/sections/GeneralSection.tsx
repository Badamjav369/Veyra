import { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { defaultServerUrl } from '../../../net/connection';
import type { Prefs } from '../../../state/prefs';
import { usePrefs } from '../../../state/prefs';
import { Segmented, SwitchRow } from '../../ui/controls';
import { Field } from '../Field';

/** Everyday behaviour: clock format, Enter-to-send, and which relay server to talk to. */
export function GeneralSection() {
  const { t } = useI18n();
  const { prefs, setPrefs } = usePrefs();
  return (
    <>
      <SwitchRow
        id="sw-enter"
        label={t('settings.enterToSend')}
        hint={t('settings.enterToSendHint')}
        checked={prefs.enterToSend}
        onChange={(enterToSend) => setPrefs({ enterToSend })}
      />
      <Field label={t('settings.clock')}>
        <Segmented<Prefs['clock']>
          label={t('settings.clock')}
          value={prefs.clock}
          onChange={(clock) => setPrefs({ clock })}
          options={[
            { value: '24h', label: t('clock.24h') },
            { value: '12h', label: t('clock.12h') },
          ]}
        />
      </Field>
      <ServerField />
    </>
  );
}

function ServerField() {
  const { t } = useI18n();
  const { prefs, setPrefs } = usePrefs();
  const [value, setValue] = useState(prefs.server);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="form__row"
      onSubmit={(e) => {
        e.preventDefault();
        setPrefs({ server: value.trim() === defaultServerUrl() ? '' : value.trim() });
        setSaved(true);
      }}
    >
      <label htmlFor="server-url" className="label">
        {t('settings.server')}
      </label>
      <div className="field">
        <input
          id="server-url"
          value={value}
          placeholder={defaultServerUrl()}
          spellCheck={false}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
        />
        <button type="submit" className="btn btn--outline btn--small" disabled={value.trim() === prefs.server}>
          {t('settings.serverSave')}
        </button>
      </div>
      <small className="help help--small">{saved ? t('settings.serverSaved') : t('settings.serverHint', { url: defaultServerUrl() })}</small>
    </form>
  );
}
