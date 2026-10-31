import type { SupportTicket } from './types';
import { formatDate } from './labels';
export default function SupportThread({ tickets }: { tickets: SupportTicket[] }) {
  return <>{tickets.map(ticket => <article className="ticket" key={ticket.id}><div className="action-row"><h3 className="font-semibold text-sm">{ticket.subject}</h3><span className="status-label">{ticket.status === 'RESOLVED' ? 'Resolved' : 'Open'}</span></div><p>{ticket.message}</p><p className="muted">{formatDate(ticket.createdAt)}</p>{ticket.reply && <div className="ticket-reply"><strong className="text-xs">PayNShip reply</strong><p>{ticket.reply}</p></div>}</article>)}</>;
}
