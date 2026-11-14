import type { Dispatch } from 'react';
import { useI18n } from '../../../i18n/index';
import type { MessageKey } from '../../../i18n/en';
import type { ChatAction } from '../../../state/chat';
import { activeId } from '../../../state/chat';
import type { ChatState, Timer } from '../../../types';
import { TIMERS } from '../../../types';
import { Segmented } from '../../ui/controls';

/** How long messages in this conversation live after they are read. */
export function TimerSection({ state, dispatch }: { state: ChatState; dispatch: Dispatch<ChatAction> }) {
  const { t } = useI18n();
  const timer = state.timers[activeId(state)] ?? 'off';
  return (
    <>
      <Segmented<Timer>
        label={t('info.disappearing')}
        value={timer}
        onChange={(v) => dispatch({ type: 'timer', value: v, at: Date.now() })}
        options={TIMERS.map((v) => ({ value: v, label: t(`timer.${v}` as MessageKey) }))}
      />
      <p className="help">{timer === 'off' ? t('timer.noteOff') : t('timer.noteOn', { v: t(`timer.${timer}` as MessageKey) })}</p>
    </>
  );
}
