'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/TranslationContext';
import EventCard from '@/components/EventCard';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');
  
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    loadEvents();
    loadVouchers();
  }, []);

  // Lấy 6 sự kiện hot để hiển thị trong banner hero
  const featuredEvents = events.slice(0, 6);

  // Tự động chuyển slide banner mỗi 5 giây
  useEffect(() => {
    if (featuredEvents.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % featuredEvents.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredEvents.length]);

  const loadVouchers = async () => {
    try {
      const res = await apiRequest('/vouchers/active');
      if (res.success) setVouchers(res.data || []);
    } catch (err) { 
      console.error('Vouchers load error:', err); 
    }
  };

  const loadEvents = async () => {
    try {
      const res = await apiRequest('/events');
      if (res.success) setEvents(res.data || []);
    } catch (err) { 
      console.error('Events load error:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  const formatPrice = (ticketTypes) => {
    if (!ticketTypes || ticketTypes.length === 0) return 'Liên hệ';
    const min = Math.min(...ticketTypes.map(t => t.price));
    if (min === 0) return t('common.free') || 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(min);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const API_BASE = 'http://localhost:8080'; // Cổng ảnh Backend

  // Điều hướng bộ lọc từ thanh danh mục phụ
  const handleSubNavbarClick = (tabKey) => {
    if (tabKey === 'VOUCHERS') {
      const element = document.getElementById('vouchers-section');
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    
    setActiveTab(tabKey);
    const element = document.getElementById('events-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Logic lọc sự kiện trên giao diện theo Tab (giống Sub-Navbar)
  const getFilteredEvents = () => {
    if (activeTab === 'ALL') return events;
    return events.filter(e => {
      const catId = e.category?.id;
      const catName = e.category?.name?.toLowerCase();
      
      if (activeTab === 'MUSIC') {
        return catId === 2 || catName?.includes('nhạc');
      }
      if (activeTab === 'ART') {
        return catId === 4 || catName?.includes('nghệ thuật') || catName?.includes('sân khấu');
      }
      if (activeTab === 'SPORTS') {
        return catId === 3 || catName?.includes('thao') || catName?.includes('chạy');
      }
      if (activeTab === 'ACADEMIC') {
        return catId === 1 || catName?.includes('học') || catName?.includes('nghệ');
      }
      if (activeTab === 'SKILLS') {
        return catId === 6 || catName?.includes('kỹ năng');
      }
      if (activeTab === 'VOLUNTEER') {
        return catId === 7 || catName?.includes('nguyện') || catName?.includes('thiện');
      }
      if (activeTab === 'BUSINESS') {
        return catId === 5 || catName?.includes('kinh tế') || catName?.includes('khởi nghiệp') || catName?.includes('doanh');
      }
      if (activeTab === 'OTHER') {
        return catId === 8 || catName?.includes('khác') || catName?.includes('gaming') || catName?.includes('giải trí');
      }
      
      return catId === activeTab;
    });
  };

  const filteredEventsList = getFilteredEvents();
  const highlightedVoucher = vouchers[0];

  return (
    <>
      <Navbar />



      {/* 2. HERO BANNER SLIDER (Full-width, Premium Style) */}
      <section className="hero-banner-section">
        {loading ? (
          <div style={{ height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        ) : featuredEvents.length > 0 ? (
          <div className="hero-banner-slider-container">
            {/* Viewport — clips the slides */}
            <div className="hero-banner-viewport">
              <div className="hero-banner-wrapper" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
                {featuredEvents.map((ev, idx) => (
                  <div key={ev.id} className="hero-banner-slide">
                    {/* Background Image */}
                    <img
                      src={ev.imageUrl ? `${API_BASE}${ev.imageUrl}` : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1920&q=80'}
                      alt={ev.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1920&q=80';
                      }}
                    />

                    {/* Dark Gradient Overlay */}
                    <div className="hero-banner-overlay" />

                    {/* Info Content */}
                    <div className="hero-banner-info">
                      <div className="hero-banner-text">
                        {/* Category Badge */}
                        <span className="hero-banner-category">
                          {ev.category?.name || t('nav.events')}
                        </span>
                        
                        {/* Title */}
                        <h2 className="hero-banner-title">{ev.title}</h2>
                        
                        {/* Meta: Date + Location */}
                        <div className="hero-banner-meta">
                          <span className="hero-banner-meta-item">
                            <span className="hero-banner-meta-icon">📅</span>
                            {formatDate(ev.startTime)}
                          </span>
                          <span className="hero-banner-meta-item">
                            <span className="hero-banner-meta-icon">📍</span>
                            {ev.location || 'HUTECH'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="hero-banner-actions">
                        <span className="hero-banner-price">
                          {formatPrice(ev.ticketTypes)}
                        </span>
                        <Link href={`/events/${ev.id}`} className="hero-banner-btn">
                          {t('favorites.view_detail')} →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            {featuredEvents.length > 1 && (
              <>
                <button
                  className="hero-banner-arrow left"
                  onClick={() => setCarouselIndex(prev => prev === 0 ? featuredEvents.length - 1 : prev - 1)}
                >
                  ‹
                </button>
                <button
                  className="hero-banner-arrow right"
                  onClick={() => setCarouselIndex(prev => (prev + 1) % featuredEvents.length)}
                >
                  ›
                </button>
              </>
            )}

            {/* Dot Indicators */}
            <div className="hero-banner-dots">
              {featuredEvents.map((_, i) => (
                <button
                  key={i}
                  className={`hero-banner-dot ${carouselIndex === i ? 'active' : ''}`}
                  onClick={() => setCarouselIndex(i)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Fallback when no events */
          <div className="hero-banner-slider-container">
            <div className="hero-banner-slide" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0d9488)' }}>
              <div className="hero-banner-overlay" />
              <Link href="/agency" className="hero-banner-cta">
                <h3>{t('home.welcome_title')}</h3>
                <p>{t('home.welcome_desc')}</p>
                <span className="hero-banner-btn">{t('nav.register_agency')}</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 820px) {
          .home-voucher-banner { grid-template-columns: 1fr !important; padding: 22px !important; }
          .home-voucher-actions { justify-content: flex-start !important; }
        }
      ` }} />
      <section style={{ background: '#faf6ee', padding: '2.5rem 0 0' }}>
        <div className="container">
          <div className="home-voucher-banner" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(260px, 0.7fr)',
            gap: '24px',
            alignItems: 'center',
            padding: '28px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #052e2b 0%, #047857 58%, #10b981 100%)',
            color: '#fff',
            boxShadow: '0 24px 60px -32px rgba(4, 120, 87, 0.75)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Voucher sinh viên
              </div>
              <h2 style={{ margin: '14px 0 8px', fontSize: 'clamp(1.65rem, 3vw, 2.6rem)', lineHeight: 1.08, fontWeight: 900 }}>
                Săn ưu đãi vé sự kiện ngay hôm nay
              </h2>
              <p style={{ margin: 0, maxWidth: 680, color: 'rgba(255,255,255,0.82)', fontSize: '1rem', lineHeight: 1.6 }}>
                {highlightedVoucher
                  ? `Dùng mã ${highlightedVoucher.code} khi thanh toán để nhận ưu đãi phù hợp cho đơn vé của bạn.`
                  : 'Theo dõi mã giảm giá mới và áp dụng trực tiếp ở bước thanh toán vé.'}
              </p>
              <div className="home-voucher-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px' }}>
                <Link href="/events" style={{ textDecoration: 'none', color: '#064e3b', background: '#fff', padding: '12px 18px', borderRadius: '999px', fontWeight: 900 }}>
                  Khám phá sự kiện
                </Link>
                <button type="button" onClick={() => handleSubNavbarClick('VOUCHERS')} style={{ border: '1px solid rgba(255,255,255,0.32)', background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '12px 18px', borderRadius: '999px', fontWeight: 800, cursor: 'pointer' }}>
                  Xem voucher
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1, justifySelf: 'stretch' }}>
              <div style={{ background: '#fff', color: '#0f172a', borderRadius: '20px', padding: '22px', boxShadow: '0 18px 44px -26px rgba(15,23,42,0.7)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mã ưu đãi</div>
                <div style={{ marginTop: '10px', padding: '14px 16px', borderRadius: '14px', background: '#ecfdf5', border: '1px dashed #10b981', fontSize: '1.55rem', fontWeight: 900, letterSpacing: '0.04em', textAlign: 'center' }}>
                  {highlightedVoucher?.code || 'TRIVENT'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px', color: '#475569', fontSize: '0.86rem', fontWeight: 700 }}>
                  <span style={{ padding: '10px', borderRadius: '12px', background: '#f8fafc', textAlign: 'center' }}>Áp dụng nhanh</span>
                  <span style={{ padding: '10px', borderRadius: '12px', background: '#f8fafc', textAlign: 'center' }}>Thanh toán vé</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN EVENTS LIST (With Tabs Filter) */}
      <section className="section" id="events-section" style={{ background: '#faf6ee', padding: '4rem 0 5rem' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#0f172a' }}>{t('home.explore_section_title')}</h2>
            <p style={{ color: '#64748b', fontSize: '1.05rem', marginTop: '0.5rem' }}>{t('home.explore_section_subtitle')}</p>
          </div>



          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
              <p style={{ color: '#64748b', marginTop: '1rem' }}>{t('home.loading_events')}</p>
            </div>
          ) : filteredEventsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>{t('home.no_events_announced')}</h3>
              <p style={{ color: '#64748b', maxWidth: 450, margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                {t('home.no_events_announced_desc')}
              </p>
              <Link href="/agency" className="btn btn-primary" style={{ borderRadius: '50px' }}>
                {t('home.register_agency_create')}
              </Link>
            </div>
          ) : (
            <>
              <style dangerouslySetInnerHTML={{ __html: `
                .cinestar-strict-grid {
                  display: grid;
                  grid-template-columns: repeat(4, minmax(0, 1fr));
                  gap: 1.5rem;
                }
                @media (max-width: 1024px) { .cinestar-strict-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
                @media (max-width: 768px) { .cinestar-strict-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
                @media (max-width: 480px) { .cinestar-strict-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); } }
                
                /* Bypass cache for overlay */
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
              <div className="cinestar-strict-grid">
                {filteredEventsList.map(event => (
                  <div key={event.id}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>

              {filteredEventsList.length > 6 && (
                <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
                  <Link href="/events" className="btn btn-outline" style={{ borderRadius: '50px', padding: '12px 30px', fontWeight: 700 }}>
                    {t('home.view_all')} →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>



      {/* 5. WHY CHOOSE TRIVENT (Bento Grid) */}
      <section className="section" style={{ background: '#faf6ee', padding: '6rem 0', borderTop: '1px solid #efe8da' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>{t('home.why_title')}</h2>
            <p style={{ color: '#64748b' }}>{t('home.why_desc')}</p>
          </div>
          
          <div className="bento-grid">
            {/* Feature 1 - Large spanning 8 cols */}
            <div className="bento-item bento-col-span-8" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#166534' }}>{t('home.why_item1_title')}</h3>
              <p style={{ color: '#15803d', fontSize: '1.05rem', maxWidth: '85%', lineHeight: 1.6 }}>
                {t('home.why_item1_desc')}
              </p>
            </div>

            {/* Feature 2 - Small spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t('home.why_item2_title')}</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {t('home.why_item2_desc')}
              </p>
            </div>

            {/* Feature 3 - Medium spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t('home.why_item3_title')}</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {t('home.why_item3_desc')}
              </p>
            </div>

            {/* Feature 4 - Medium spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#92400e' }}>{t('home.why_item4_title')}</h3>
              <p style={{ color: '#b45309', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {t('home.why_item4_desc')}
              </p>
            </div>

            {/* Feature 5 - Medium spanning 4 cols */}
            <div className="bento-item bento-col-span-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t('home.why_item5_title')}</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {t('home.why_item5_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
