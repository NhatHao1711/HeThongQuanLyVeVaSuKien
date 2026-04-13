'use client';
import Link from 'next/link';
import { icons } from './Icons';

export default function EventCard({ event }) {
  const formatPrice = (ticketTypes) => {
    if (!ticketTypes || ticketTypes.length === 0) return 'Liên hệ';
    const min = Math.min(...ticketTypes.map(t => t.price));
    if (min === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(min);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const API_BASE = 'http://localhost:8080';

  return (
    <Link href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden',
        border: '1px solid #e2e8f0', transition: 'all 0.25s',
        cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
        <div style={{
          height: 180,
          background: event.imageUrl ? `url(${API_BASE}${event.imageUrl}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}>
          {!event.imageUrl && <span style={{ opacity: 0.4 }}>{icons.calendar(48, '#fff')}</span>}
          {/* Dynamic status badge */}
          {(() => {
            const now = new Date();
            const start = new Date(event.startTime || event.fromDate);
            const end = new Date(event.endTime || event.toDate);
            let label = '', bg = '';
            if (event.status === 'CANCELLED') { label = 'Đã hủy'; bg = '#ef4444'; }
            else if (now < start) { label = 'Sắp diễn ra'; bg = '#f59e0b'; }
            else if (now >= start && now <= end) { label = 'Đang diễn ra'; bg = '#10b981'; }
            else { label = 'Đã kết thúc'; bg = '#6b7280'; }
            return (
              <span style={{
                position: 'absolute', top: 10, left: 10,
                background: bg, color: '#fff', padding: '4px 10px',
                borderRadius: 20, fontSize: '0.7rem', fontWeight: 600
              }}>{label}</span>
            );
          })()}
          {formatPrice(event.ticketTypes) === 'Miễn phí' && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              background: '#00B46E', color: '#fff', padding: '4px 10px',
              borderRadius: 20, fontSize: '0.72rem', fontWeight: 600
            }}>Miễn phí</span>
          )}
        </div>
        <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: 6, lineHeight: 1.4 }}>{event.title}</h3>
          <p style={{ fontSize: '0.82rem', color: '#718096', marginBottom: '0.8rem', lineHeight: 1.5, flex: 1 }}>
            {event.description?.substring(0, 80)}{event.description?.length > 80 ? '...' : ''}
          </p>
          <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: 2 }}>{icons.mapPin(13, '#a0aec0')} {event.location || 'Chưa xác định'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{icons.calendar(13, '#a0aec0')} {formatDate(event.startTime || event.fromDate)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#00B46E' }}>{formatPrice(event.ticketTypes)}</span>
            <span style={{ padding: '6px 14px', background: '#00B46E', color: '#fff', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>Đặt vé →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
