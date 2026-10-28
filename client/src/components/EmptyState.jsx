import { FiInbox } from 'react-icons/fi';
export default function EmptyState({ title = 'Nothing here yet', description = 'When information is available, it will appear here.' }) {
  return <div className="empty-state"><span><FiInbox size={24} /></span><h3>{title}</h3><p>{description}</p></div>;
}
