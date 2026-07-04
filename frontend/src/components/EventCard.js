'use client';
import Link from 'next/link';

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
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .cinestar-overlay-force {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 10;
        }
        .cinestar-event-card:hover .cinestar-overlay-force {
          opacity: 1;
        }
        .cinestar-event-card {
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .cinestar-event-card:hover {
          transform: translateY(-4px);
        }
      ` }} />
      <Link href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
      <div className="cinestar-event-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* The Image Container */}
                      <div className="cinestar-poster" style={{ position: 'relative', width: '100%', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }}>
                        {event.imageUrl ? (
                          <>
                            {/* Blurred background image to fill blank spaces */}
                            <img 
                              src={`${API_BASE}${event.imageUrl}`} 
                              alt="" 
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(20px) brightness(0.6)', transform: 'scale(1.15)' }} 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                              }}
                            />
                            {/* Sharp foreground image centered and fitted */}
                            <img 
                              src={`${API_BASE}${event.imageUrl}`} 
                              alt={event.title} 
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=600&q=80';
                              }}
                            />
                          </>
                        ) : (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ opacity: 0.5, fontWeight: 700, color: '#fff', fontSize: '1.2rem' }}>TRIVENT</span>
                          </div>
                        )}
                        
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
                              borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, zIndex: 2
                            }}>{label}</span>
                          );
                        })()}

                        {/* Hover Overlay */}
                        <div className="cinestar-overlay-force">
                           <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff', lineHeight: 1.4 }}>{event.title}</h3>
                           
                           <div style={{ fontSize: '0.85rem', marginBottom: '0.8rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <span style={{color: '#fde047'}}>📍</span> 
                              <span style={{lineHeight: 1.4}}>{event.location || 'HUTECH'}</span>
                           </div>
                           <div style={{ fontSize: '0.85rem', marginBottom: '0.8rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <span style={{color: '#fde047'}}>🕒</span> 
                              <span>{formatDate(event.startTime)}</span>
                           </div>
                           <div style={{ fontSize: '0.85rem', marginBottom: '0.8rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <span style={{color: '#fde047'}}>🎟️</span> 
                              <span style={{fontWeight: 700}}>{formatPrice(event.ticketTypes)}</span>
                           </div>
                           
                           <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                              <span style={{ padding: '8px 24px', background: 'transparent', border: '1px solid #fde047', color: '#fde047', borderRadius: 4, fontSize: '0.85rem', fontWeight: 700 }}>XEM CHI TIẾT</span>
                           </div>
                        </div>
                      </div>

                      {/* Title Below Poster */}
                      <div style={{ padding: '1rem 0', textAlign: 'center', background: 'transparent' }}>
                         <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {event.title}
                         </h3>
                      </div>
                    </div>
    </Link>
    </>
  );
}
