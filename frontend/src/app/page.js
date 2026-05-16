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
        <div className="hero-content" style={{ width: '100%' }}>
          <div className="hero-badge animate-in">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>✨ {t('home.hero_badge')}</span>
          </div>
          <h1 className="animate-in delay-100">
            {t('home.hero_title')}<br />
            <span className="gradient-text">{t('home.hero_title_highlight')}</span>
          </h1>
          <p className="hero-subtitle animate-in delay-200">
            {t('home.hero_subtitle')}
          </p>

          <div className="hero-actions animate-in delay-300">
            <Link href="/events" className="btn btn-primary btn-lg" style={{ fontSize: '1.05rem', padding: '16px 36px', boxShadow: '0 8px 20px rgba(0, 180, 110, 0.3)' }}>
              {t('home.explore_btn')}
            </Link>
            <Link href="/events/create" className="btn btn-outline btn-lg glass" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
              {t('home.create_btn')}
            </Link>
          </div>

          {/* Hero Search Bar - Pill Shaped */}
          <form onSubmit={handleSearch} className="animate-in delay-400 glass" style={{
            display: 'flex', alignItems: 'center', gap: '0', width: '100%', maxWidth: 700, margin: '3rem auto 0',
            borderRadius: '50px', padding: '0.4rem', border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            background: 'rgba(255,255,255,0.08)'
          }}>
            <div style={{ flex: 2, position: 'relative', display: 'flex', alignItems: 'center', paddingLeft: '1rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>{icons.search(18)}</span>
              <input
                type="text" placeholder="Tên sự kiện..." value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none'
                }}
              />
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 10px' }}></div>
            <div style={{ flex: 1.5, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>{icons.mapPin(18)}</span>
              <input
                type="text" placeholder="Địa điểm" value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none'
                }}
              />
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 10px' }}></div>
            <div style={{ flex: 1.5, display: 'flex', alignItems: 'center' }}>
              <input
                type="date" value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none',
                  colorScheme: 'dark'
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{
              borderRadius: '50px', padding: '0 2rem', height: 48, fontSize: '1rem', fontWeight: 700,
              boxShadow: '0 4px 15px rgba(0, 180, 110, 0.4)', marginLeft: '0.5rem'
            }}>
              Tìm kiếm
            </button>
          </form>

          <div className="hero-stats animate-in delay-400" style={{ marginTop: '3rem' }}>
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
              <div className="hero-stat-label">Trường đại học</div>
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
                      minHeight: 380, display: 'flex', alignItems: 'flex-end', position: 'relative', overflow: 'hidden'
                    }}>
                      {/* Blurred Background Layer */}
                      <div style={{
                        position: 'absolute', inset: 0, zIndex: 0,
                        background: ev.imageUrl ? `url(${API_BASE}${ev.imageUrl}) center/cover` : carouselGradients[i % carouselGradients.length],
                        filter: ev.imageUrl ? 'blur(25px) brightness(0.6)' : 'none',
                        transform: ev.imageUrl ? 'scale(1.1)' : 'none'
                      }} />
                      
                      {/* Contained Image Layer (shows full image) */}
                      {ev.imageUrl && (
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 1,
                          background: `url(${API_BASE}${ev.imageUrl}) center/contain no-repeat`
                        }} />
                      )}

                      {/* Dark Gradient Overlay for Text Readability */}
                      <div style={{
                        position: 'absolute', inset: 0, zIndex: 2,
                        background: 'linear-gradient(to top, rgba(15,23,42,1) 0%, rgba(15,23,42,0.6) 40%, transparent 100%)'
                      }} />
                      
                      {/* Content - Glassmorphism Glass */}
                      <div className="glass-dark" style={{ position: 'relative', zIndex: 3, padding: '2rem 2.5rem', width: '100%', color: '#fff', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                          <span style={{
                            background: 'var(--primary)', padding: '4px 12px', borderRadius: 20,
                            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', boxShadow: '0 2px 10px rgba(0,180,110,0.4)'
                          }}>{ev.category?.name || 'Sự kiện'}</span>
                          <span style={{
                            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'
                          }}>📅 {formatFullDate(ev.startTime)}</span>
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.8rem', lineHeight: 1.2, textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          {ev.title}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.95rem', opacity: 0.9 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{icons.mapPin(16)} {ev.location || 'Chưa xác định'}</span>
                          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#4ade80', textShadow: '0 0 10px rgba(74,222,128,0.3)' }}>
                            {formatPrice(ev.ticketTypes)}
                          </span>
                          <span style={{
                            background: 'linear-gradient(135deg, #00B46E, #10b981)', padding: '8px 24px', borderRadius: 50,
                            fontWeight: 700, fontSize: '0.9rem', marginLeft: 'auto', boxShadow: '0 4px 15px rgba(0,180,110,0.4)'
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

      {/* Voucher Showcase - Ticket UI */}
      {vouchers.length > 0 && (
        <section className="section" style={{ background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <div className="section-header" style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: '50px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>
                ✨ SIÊU ƯU ĐÃI
              </div>
              <h2 style={{ fontSize: '2.2rem' }}>Mã giảm giá cho sinh viên</h2>
              <p>Lưu ngay mã giảm giá và áp dụng khi thanh toán vé sự kiện</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {vouchers.map((v, i) => (
                <div key={i} className="voucher-ticket">
                  <div className="voucher-left" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1.2 }}>
                      {v.discountPercent ? `${v.discountPercent}%` : `${new Intl.NumberFormat('vi-VN').format(v.discountAmount/1000)}K`}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, marginTop: '4px' }}>GIẢM GIÁ</div>
                    {v.description && <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '8px', lineHeight: 1.4 }}>{v.description}</p>}
                  </div>
                  <div className="voucher-divider"></div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, background: '#fff' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', letterSpacing: 2, marginBottom: '0.5rem' }}>
                      {v.code}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>{v.remainingUses != null ? `Còn ${v.remainingUses} lượt` : 'Không giới hạn'}</span>
                      <span>{v.expiryDate ? `HSD: ${new Date(v.expiryDate).toLocaleDateString('vi-VN')}` : 'Không thời hạn'}</span>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(v.code); alert(`Đã sao chép mã: ${v.code}`); }}
                      className="btn btn-outline btn-sm"
                      style={{ border: '1px dashed var(--primary)', color: 'var(--primary)', alignSelf: 'flex-start', borderRadius: '50px' }}
                    >
                      Sao chép mã
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features - Bento Grid */}
      <section className="section" style={{ background: '#ffffff', padding: '6rem 2rem' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem' }}>Tại sao chọn TRIVENT?</h2>
            <p style={{ fontSize: '1.1rem' }}>Nền tảng được thiết kế chuyên biệt cho sinh viên</p>
          </div>
          
          <div className="bento-grid">
            {/* Feature 1 - Large spanning 8 cols */}
            <div className="bento-item bento-col-span-8" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>

              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#166534' }}>Luôn có phần cho bạn</h3>
              <p style={{ color: '#15803d', fontSize: '1.1rem', maxWidth: '80%' }}>Hệ thống giữ vé thông minh của chúng mình đảm bảo không bao giờ có tình trạng "bán lố". Cứ yên tâm đặt vé, không cần sợ bị giành giật phút chót đâu nhé!</p>
            </div>

            {/* Feature 2 - Small spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: '#f8fafc' }}>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Thanh toán siêu tốc</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Chốt vé mượt mà chỉ với 1 chạm qua VNPay, ví MoMo hay chuyển khoản ngân hàng.</p>
            </div>

            {/* Feature 3 - Medium spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: '#fff', border: '2px solid #f1f5f9' }}>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Check-in trong 1 giây</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Mã QR xịn sò, bảo mật tối đa. Chỉ việc giơ điện thoại lên quét là vào cổng quẩy hết mình!</p>
            </div>

            {/* Feature 4 - Medium spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#92400e' }}>Tìm bạn đi cùng</h3>
              <p style={{ color: '#b45309' }}>Sợ đi quẩy một mình? Tính năng ghép đôi độc quyền sẽ tìm ngay bạn đồng hành cùng trường cho bạn.</p>
            </div>

            {/* Feature 5 - Medium spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: '#f8fafc' }}>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Trợ giá cực sốc</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Săn vé xịn với giá "hạt dẻ". Vô vàn ưu đãi độc quyền dành riêng cho thẻ sinh viên của bạn.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
