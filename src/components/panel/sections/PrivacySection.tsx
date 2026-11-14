import type { Dispatch } from 'react';
import { useI18n } from '../../../i18n/index';
import type { ChatAction } from '../../../state/chat';
import type { ChatState } from '../../../types';
import { SwitchRow } from '../../ui/controls';

/** What other people (and onlookers) can learn about you. These apply to every conversation. */
export function PrivacySection({ state, dispatch }: { state: ChatState; dispatch: Dispatch<ChatAction> }) {
  const { t } = useI18n();
  return (
    <>
      <SwitchRow
        id="sw-blur"
        label={t('toggle.hideOnBlur')}
        hint={t('toggle.hideOnBlurHint')}
        checked={state.toggles.hideOnBlur}
        onChange={() => dispatch({ type: 'toggle', key: 'hideOnBlur' })}
      />
      <SwitchRow
        id="sw-receipts"
        label={t('toggle.receipts')}
        hint={t('toggle.receiptsHint')}
        checked={state.toggles.receipts}
        onChange={() => dispatch({ type: 'toggle', key: 'receipts' })}
      />
      <SwitchRow
        id="sw-typing"
        label={t('toggle.typing')}
        hint={t('toggle.typingHint')}
        checked={state.toggles.typing}
        onChange={() => dispatch({ type: 'toggle', key: 'typing' })}
      />
    </>
  );
}
