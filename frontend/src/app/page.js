'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { icons } from '@/components/Icons';
import { useTranslation } from '@/context/TranslationContext';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => { loadEvents(); loadVouchers(); }, []);

  // Auto-slide carousel every 4 seconds
  const featuredEvents = events.slice(0, 5);
  useEffect(() => {
    if (featuredEvents.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % featuredEvents.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [featuredEvents.length]);

  const loadVouchers = async () => {
    try {
      const res = await apiRequest('/vouchers/active');
      if (res.success) setVouchers(res.data || []);
    } catch (err) { console.error('Vouchers load error:', err); }
  };

  const loadEvents = async () => {
    try {
      const res = await apiRequest('/events');
      if (res.success) setEvents(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatPrice = (ticketTypes) => {
    if (!ticketTypes || ticketTypes.length === 0) return 'Liên hệ';
    const min = Math.min(...ticketTypes.map(t => t.price));
    if (min === 0) return t('common.free');
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(min);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatFullDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchKeyword) query.append('q', searchKeyword);
    if (searchLocation) query.append('location', searchLocation);
    if (searchDate) query.append('date', searchDate);
    router.push(`/events?${query.toString()}`);
  };

  const API_BASE = 'http://localhost:8080'; // Used for image URLs

  const carouselGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];

  return (
    <>
      <Navbar />

      {/* Hero with Search */}
      <section className="hero">
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✨ {t('home.hero_badge')}</span>
          </div>
          <h1>
            {t('home.hero_title')}<br />
            <span className="gradient-text">{t('home.hero_title_highlight')}</span>
          </h1>
          <p className="hero-subtitle animate-in" style={{ animationDelay: '0.2s', color: 'rgba(255,255,255,0.8)' }}>
            {t('home.hero_subtitle')}
          </p>

          <div className="hero-actions animate-in" style={{ animationDelay: '0.3s' }}>
            <Link href="/events" className="btn btn-primary btn-lg" style={{ fontSize: '1.05rem', padding: '16px 36px' }}>
              {t('home.explore_btn')}
            </Link>
            <Link href="/events/create" className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}>
              {t('home.create_btn')}
            </Link>
          </div>

          {/* Hero Search Bar */}
          <form onSubmit={handleSearch} style={{
            display: 'flex', alignItems: 'stretch', gap: '0.5rem', width: '100%', maxWidth: 800, margin: '1.5rem auto 0',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            borderRadius: 16, padding: '0.5rem', border: '1px solid rgba(255,255,255,0.2)',
            boxSizing: 'border-box'
          }}>
            <input
              type="text" placeholder="Tìm sự kiện..." value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              style={{
                flex: 2, minWidth: 0, padding: '0 1rem', borderRadius: 12, border: 'none',
                background: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', outline: 'none',
                height: 44, boxSizing: 'border-box'
              }}
            />
            <input
              type="text" placeholder="Địa điểm" value={searchLocation}
              onChange={e => setSearchLocation(e.target.value)}
              style={{
                flex: 1, minWidth: 0, padding: '0 1rem', borderRadius: 12, border: 'none',
                background: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', outline: 'none',
                height: 44, boxSizing: 'border-box'
              }}
            />
            <input
              type="date" value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              style={{
                flex: 1, minWidth: 0, padding: '0 1rem', borderRadius: 12, border: 'none',
                background: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', outline: 'none',
                height: 44, boxSizing: 'border-box'
              }}
            />
            <button type="submit" className="btn btn-primary" style={{
              borderRadius: 12, padding: '0 1.5rem', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              height: 44, boxSizing: 'border-box', flexShrink: 0
            }}>
              {icons.search(16, '#fff')} Search
            </button>
          </form>

          <div className="hero-stats" style={{ marginTop: '2rem' }}>
            <div className="hero-stat">
              <div className="hero-stat-number">{events.length || '0'}</div>
              <div className="hero-stat-label">{t('home.stat_events')}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number">50K+</div>
              <div className="hero-stat-label">{t('home.stat_users')}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number">30+</div>
              <div className="hero-stat-label">Universities</div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔥 Featured Events Carousel */}
      {!loading && featuredEvents.length > 0 && (
        <section style={{ padding: '2.5rem 0', background: '#f8fafc' }}>
          <div className="container">
            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
              <h2>🔥 Sự kiện đang HOT</h2>
              <p>Đừng bỏ lỡ — các sự kiện được săn vé nhiều nhất</p>
            </div>
            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
              {/* Slides */}
              <div style={{ display: 'flex', transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(-${carouselIndex * 100}%)` }}>
                {featuredEvents.map((ev, i) => (
                  <Link href={`/events/${ev.id}`} key={ev.id} style={{ minWidth: '100%', textDecoration: 'none' }}>
                    <div style={{
                      background: ev.imageUrl ? `url(${API_BASE}${ev.imageUrl}) center/cover` : carouselGradients[i % carouselGradients.length],
                      minHeight: 340, display: 'flex', alignItems: 'flex-end', position: 'relative'
                    }}>
                      {/* Overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)'
                      }} />
                      {/* Content */}
                      <div style={{ position: 'relative', zIndex: 2, padding: '2rem 2.5rem', width: '100%', color: '#fff' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{
                            background: 'var(--primary)', padding: '4px 12px', borderRadius: 20,
                            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                          }}>{ev.category?.name || 'Sự kiện'}</span>
                          <span style={{
                            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600
                          }}>📅 {formatFullDate(ev.startTime)}</span>
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                          {ev.title}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
                          <span>📍 {ev.location || 'Chưa xác định'}</span>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4ade80' }}>
                            {formatPrice(ev.ticketTypes)}
                          </span>
                          <span style={{
                            background: '#00B46E', padding: '6px 20px', borderRadius: 10,
                            fontWeight: 700, fontSize: '0.85rem', marginLeft: 'auto'
                          }}>Đặt vé ngay →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Navigation Arrows */}
              {featuredEvents.length > 1 && (
                <>
                  <button onClick={(e) => { e.preventDefault(); setCarouselIndex(prev => prev === 0 ? featuredEvents.length - 1 : prev - 1); }}
                    style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
                      width: 44, height: 44, cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>‹</button>
                  <button onClick={(e) => { e.preventDefault(); setCarouselIndex(prev => (prev + 1) % featuredEvents.length); }}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
                      width: 44, height: 44, cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>›</button>
                </>
              )}

              {/* Dots */}
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 8, zIndex: 3
              }}>
                {featuredEvents.map((_, i) => (
                  <button key={i} onClick={() => setCarouselIndex(i)} style={{
                    width: carouselIndex === i ? 24 : 8, height: 8, borderRadius: 4,
                    background: carouselIndex === i ? '#00B46E' : 'rgba(255,255,255,0.5)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0
                  }} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Events with Images */}
      <section className="section" id="events">
        <div className="container">
          <div className="section-header">
            <h2>Sự kiện nổi bật</h2>
            <p>Đừng bỏ lỡ những sự kiện hot nhất</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Đang tải...</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p>Chưa có sự kiện nào. Hãy đăng nhập Admin để tạo và publish sự kiện!</p>
            </div>
          ) : (
            <>
              <div className="events-grid">
                {events.slice(0, 6).map(event => (
                  <Link href={`/events/${event.id}`} key={event.id}>
                    <div className="card">
                      <div className="card-image" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: event.imageUrl ? `url(${API_BASE}${event.imageUrl}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}>
                        {!event.imageUrl && <span style={{ color: 'rgba(255,255,255,0.5)' }}>{icons.calendar(48, 'rgba(255,255,255,0.4)')}</span>}
                      </div>
                      <div className="card-body">
                        <h3 className="card-title">{event.title}</h3>
                        <p className="card-text" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.description}</p>
                        <div className="event-card-meta">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>{icons.mapPin(14, '#888')} {event.location}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>{icons.calendar(14, '#888')} {formatDate(event.startTime)}</span>
                        </div>
                        <div className="event-card-price">
                          <span className="price">{formatPrice(event.ticketTypes)}</span>
                          <span className="btn btn-primary btn-sm">Đặt vé</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {events.length > 6 && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <Link href="/events" className="btn btn-outline">Xem tất cả sự kiện →</Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Voucher Showcase */}
      {vouchers.length > 0 && (
        <section className="section" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)' }}>
          <div className="container">
            <div className="section-header">
              <h2 style={{ color: '#92400e' }}>🏷️ Mã giảm giá cho sinh viên</h2>
              <p style={{ color: '#a16207' }}>Lưu mã ngay và sử dụng khi đặt vé!</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {vouchers.map((v, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: 16, overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '2px dashed #f59e0b',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ background: 'linear-gradient(135deg, #00B46E, #10b981)', padding: '1rem 1.2rem', color: 'white' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: 1 }}>
                      {v.discountPercent ? `Giảm ${v.discountPercent}%` : `Giảm ${new Intl.NumberFormat('vi-VN').format(v.discountAmount)}đ`}
                    </div>
                    {v.description && <p style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: 4 }}>{v.description}</p>}
                  </div>
                  <div style={{ padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', letterSpacing: 2, background: '#f1f5f9', padding: '4px 12px', borderRadius: 6, display: 'inline-block' }}>
                        {v.code}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>
                        {v.remainingUses != null ? `Còn ${v.remainingUses} lượt` : 'Không giới hạn'}
                        {v.expiryDate && ` • HSD: ${new Date(v.expiryDate).toLocaleDateString('vi-VN')}`}
                      </div>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(v.code); alert(`Đã sao chép mã: ${v.code}`); }}
                      style={{
                        padding: '8px 16px', background: '#f59e0b', color: 'white',
                        border: 'none', borderRadius: 10, fontWeight: 700,
                        fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      📋 Sao chép
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-header">
            <h2>Tại sao chọn TRIVENT?</h2>
            <p>Nền tảng được thiết kế riêng cho sinh viên</p>
          </div>
          <div className="events-grid">
            {[
              { icon: icons.shield(32, '#00B46E'), title: 'Chống Over-selling', desc: 'Distributed Lock đảm bảo không bán quá số vé' },
              { icon: icons.creditCard(32, '#3b82f6'), title: 'Thanh toán an toàn', desc: 'Hỗ trợ chuyển khoản, MoMo, QR Code' },
              { icon: icons.qrCode(32, '#8b5cf6'), title: 'QR Check-in', desc: 'Mã QR mã hóa AES, check-in nhanh 1 giây' },
              { icon: icons.users(32, '#f59e0b'), title: 'Event Buddy', desc: 'Tìm bạn đi chung sự kiện cùng trường' },
              { icon: icons.zap(32, '#ef4444'), title: 'Đặt vé siêu nhanh', desc: 'Xử lý hàng ngàn request cùng lúc' },
              { icon: icons.graduationCap(32, '#06b6d4'), title: 'Dành cho sinh viên', desc: 'Giá ưu đãi từ 30+ trường đại học' },
            ].map((f, i) => (
              <div className="card" key={i} style={{ cursor: 'default' }}>
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>{f.icon}</div>
                  <h3 className="card-title">{f.title}</h3>
                  <p className="card-text">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
