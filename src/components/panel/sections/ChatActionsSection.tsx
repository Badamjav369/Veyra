import { useI18n } from '../../../i18n/index';
import { activeId, convoMeta } from '../../../state/chat';
import type { ChatState } from '../../../types';
import { BroomIcon, KeyIcon, LogoutIcon, TrashIcon } from '../../ui/Icons';

interface Props {
  state: ChatState;
  onRotate: () => void;
  onConfirm: (action: 'leave' | 'delete' | 'clear') => void;
}

/** Things you do *to* the conversation: renew its keys, wipe its history, or remove it. */
export function ChatActionsSection({ state, onRotate, onConfirm }: Props) {
  const { t } = useI18n();
  const meta = convoMeta(state, activeId(state));
  if (!meta) return null;
  const isGroup = meta.kind === 'group';
  return (
    <div className="side__actions">
      <button type="button" className="btn btn--outline btn--block" onClick={onRotate}>
        <KeyIcon size={16} />
        {isGroup ? t('info.rotateGroup') : t('info.resetSession')}
      </button>
      <button type="button" className="btn btn--outline btn--block" onClick={() => onConfirm('clear')}>
        <BroomIcon size={16} />
        {t('info.clearChat')}
      </button>
      <button type="button" className="btn btn--danger btn--block" onClick={() => onConfirm(isGroup ? 'leave' : 'delete')}>
        {isGroup ? <LogoutIcon size={16} /> : <TrashIcon size={16} />}
        {isGroup ? t('info.leaveGroup') : t('info.deleteChat')}
      </button>
    </div>
  );
}
