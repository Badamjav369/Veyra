import { useI18n } from '../../i18n/index';
import { nameOf } from '../../state/chat';
import type { Contact } from '../../types';
import { Identicon } from '../ui/Identicon';


export function MemberPicker({
  contacts,
  picked,
  onToggle,
}: {
  contacts: Contact[];
  picked: string[];
  onToggle: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="pick-list">
      {contacts.map((c) => (
        <label key={c.id} className={`pick ${picked.includes(c.id) ? 'is-picked' : ''}`}>
          <input type="checkbox" checked={picked.includes(c.id)} onChange={() => onToggle(c.id)} />
          <Identicon seed={c.id} color={c.color} size={32} photo={c.avatar} />
          <span className="pick__name">{nameOf(c)}</span>
          <span className={`pick__tag ${c.verified ? '' : 'is-warn'}`}>{c.verified ? t('info.tagVerified') : t('info.tagUnverified')}</span>
        </label>
      ))}
    </div>
  );
}
