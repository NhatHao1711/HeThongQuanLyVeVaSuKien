'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/TranslationContext';

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

  // Lấy 6 sự kiện hot để hiển thị song song làm banner
  const featuredEvents = events.slice(0, 6);

  // Tạo các cặp banner (mỗi slide hiển thị 2 banner song song)
  const bannerPairs = [];
  for (let i = 0; i < featuredEvents.length; i += 2) {
    bannerPairs.push(featuredEvents.slice(i, i + 2));
  }

  // Tự động chuyển slide banner mỗi 5 giây
  useEffect(() => {
    if (bannerPairs.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % bannerPairs.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerPairs.length]);

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

  return (
    <>
      <Navbar />



      {/* 2. DOUBLE BANNER SLIDER NỀN ĐEN (Ticketbox Style) */}
      <section className="double-banner-section">
        {loading ? (
          <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        ) : bannerPairs.length > 0 ? (
          <div className="double-banner-slider-container">
            {/* Slide Wrapper */}
            <div className="double-banner-wrapper" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
              {bannerPairs.map((pair, idx) => (
                <div key={idx} className="double-banner-slide">
                  {pair.map(ev => (
                    <div key={ev.id} className="double-banner-item">
                      {/* Banner Image */}
                      <img 
                        src={ev.imageUrl ? `${API_BASE}${ev.imageUrl}` : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80'} 
                        alt={ev.title} 
                        className="double-banner-img"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      
                      {/* Dark Overlay */}
                      <div className="double-banner-overlay" />
                      
                      {/* Details Button */}
                      <Link href={`/events/${ev.id}`} className="double-banner-btn">
                        {t('favorites.view_detail')}
                      </Link>

                      {/* Info Text */}
                      <div className="double-banner-info">
                        <h3 className="double-banner-title">{ev.title}</h3>
                        <div className="double-banner-meta">
                          <span>{t('home.time_prefix')}: {formatDate(ev.startTime)}</span>
                          <span>{t('home.location_prefix')}: {ev.location || 'HUTECH'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Nếu cặp chỉ có 1 banner, render thêm banner rỗng hoặc banner đăng ký đại lý */}
                  {pair.length === 1 && (
                    <Link href="/agency" className="double-banner-item" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', textDecoration: 'none' }}>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>{t('home.become_agency_title')}</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.88rem', maxWidth: 350 }}>{t('home.become_agency_desc')}</p>
                      <span className="double-banner-btn">{t('home.register_now')}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Điều hướng Trái Phải */}
            {bannerPairs.length > 1 && (
              <>
                <button 
                  onClick={() => setCarouselIndex(prev => prev === 0 ? bannerPairs.length - 1 : prev - 1)}
                  style={{
                    position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: '1.25rem', color: '#fff',
                    zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--primary)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                >
                  ‹
                </button>
                <button 
                  onClick={() => setCarouselIndex(prev => (prev + 1) % bannerPairs.length)}
                  style={{
                    position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: '1.25rem', color: '#fff',
                    zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--primary)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                >
                  ›
                </button>
              </>
            )}

            {/* Slider Dots */}
            <div style={{ position: 'absolute', bottom: -25, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 10 }}>
              {bannerPairs.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCarouselIndex(i)} 
                  style={{
                    width: carouselIndex === i ? 24 : 8, height: 8, borderRadius: 4,
                    background: carouselIndex === i ? '#00B46E' : 'rgba(255,255,255,0.3)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0
                  }} 
                />
              ))}
            </div>
          </div>
        ) : (
          /* Mặc định nếu không có sự kiện nào */
          <div className="double-banner-slider-container">
            <div className="double-banner-slide">
              <Link href="/agency" className="double-banner-item" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0d9488)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', textDecoration: 'none' }}>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>{t('home.welcome_title')}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', maxWidth: 400 }}>{t('home.welcome_desc')}</p>
                <span className="double-banner-btn">{t('nav.register_agency')}</span>
              </Link>
              <Link href="/agency" className="double-banner-item" style={{ background: 'linear-gradient(135deg, #4f46e5, #0891b2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', textDecoration: 'none' }}>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>{t('home.welcome_agency_title')}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', maxWidth: 400 }}>{t('home.welcome_agency_desc')}</p>
                <span className="double-banner-btn">{t('home.welcome_start_now')}</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 3. MAIN EVENTS LIST (With Tabs Filter) */}
      <section className="section" id="events-section" style={{ background: '#f8fafc', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900 }}>{t('home.explore_section_title')}</h2>
            <p style={{ color: '#64748b' }}>{t('home.explore_section_subtitle')}</p>
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
              <div className="premium-card-grid">
                {filteredEventsList.map(event => (
                  <Link href={`/events/${event.id}`} key={event.id} style={{ textDecoration: 'none' }}>
                    <div className="premium-card">
                      <div className="premium-card-image-wrapper">
                        {/* Tag category */}
                        <span className="premium-card-tag">
                          {event.category?.name || t('nav.events')}
                        </span>
                        {/* Event Image */}
                        <img 
                          src={event.imageUrl ? `${API_BASE}${event.imageUrl}` : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=600&q=80'} 
                          alt={event.title}
                          className="premium-card-img"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                      </div>
                      
                      <div className="premium-card-body">
                        <h3 className="premium-card-title">{event.title}</h3>
                        
                        <div className="premium-card-meta">
                          <div className="premium-card-meta-item">
                            <span>{t('home.location_prefix')}: {event.location || 'HUTECH'}</span>
                          </div>
                          <div className="premium-card-meta-item">
                            <span>{t('home.time_prefix')}: {formatDate(event.startTime)}</span>
                          </div>
                        </div>
                        
                        <div className="premium-card-footer">
                          <div>
                            <span className="premium-card-price-label">{t('events.booking_price_from')}</span>
                            <span className="premium-card-price">{formatPrice(event.ticketTypes)}</span>
                          </div>
                          <button className="premium-card-btn">{t('common.buy_ticket')}</button>
                        </div>
                      </div>
                    </div>
                  </Link>
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
      <section className="section" style={{ background: '#f8fafc', padding: '6rem 0', borderTop: '1px solid #e2e8f0' }}>
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
