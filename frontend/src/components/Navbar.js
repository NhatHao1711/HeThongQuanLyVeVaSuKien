'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { isLoggedIn, getUser, removeToken, apiRequest } from '@/lib/api';
import { useTranslation } from '@/context/TranslationContext';

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [now, setNow] = useState(0);
  
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const { lang, changeLang, t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const loadUnreadCount = async () => {
    try {
      const res = await apiRequest('/notifications/unread-count');
      if (res.success) setUnreadCount(res.data.count || 0);
    } catch (e) {}
  };

  const loadNotifications = async () => {
    try {
      const res = await apiRequest('/notifications');
      if (res.success) setNotifications(res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    // Keep the first client render identical to SSR, then hydrate browser-only auth state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoggedIn(isLoggedIn());
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    if (loggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadUnreadCount();
    }
  }, [pathname, loggedIn]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleNotif = () => {
    if (!showNotif) loadNotifications();
    setShowNotif(!showNotif);
  };

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const handleLogout = () => {
    removeToken();
    setLoggedIn(false);
    setUser(null);
    window.location.href = '/';
  };

  const formatTimeAgo = (d) => {
    if (!d || !now) return '';
    const diff = (now - new Date(d).getTime()) / 1000;
    if (diff < 60) return t('time.just_now') || 'Vừa xong';
    if (diff < 3600) return (t('time.minutes_ago') || '{count} phút trước').replace('{count}', Math.floor(diff / 60));
    if (diff < 86400) return (t('time.hours_ago') || '{count} giờ trước').replace('{count}', Math.floor(diff / 3600));
    return (t('time.days_ago') || '{count} ngày trước').replace('{count}', Math.floor(diff / 86400));
  };

  const toggleLang = () => {
    changeLang(lang === 'vi' ? 'en' : 'vi');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchKeyword.trim())}`);
    } else {
      router.push('/events');
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <nav className="navbar" style={{ padding: '0 4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', position: 'static' }}>
          
          {/* Trái: Logo TRIVENT dạng ảnh đã lọc nền trắng và chuyển sang màu trắng */}
          <div style={{ display: 'flex', alignItems: 'center', width: '220px' }}>
            <Link href="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img 
                src="/logo.png" 
                alt="TRIVENT Logo" 
                style={{ 
                  height: '44px', 
                  width: '145px', 
                  objectFit: 'cover', 
                  objectPosition: 'center',
                  filter: 'invert(1) brightness(100)',
                  mixBlendMode: 'screen',
                  display: 'block'
                }} 
              />
            </Link>
          </div>

          {/* Giữa: Ô tìm kiếm Ticketbox style, căn giữa tuyệt đối */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <form onSubmit={handleSearchSubmit} className="navbar-search-wrapper" style={{ margin: 0 }}>
              <input 
                type="text" 
                placeholder={t('nav.search_placeholder')} 
                className="navbar-search-input"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <button type="submit" className="navbar-search-btn">{t('home.search')}</button>
            </form>
          </div>

          {/* Phải: Actions (Không có icon trang trí) */}
          <div className="navbar-auth" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: 'auto', justifyContent: 'flex-end' }}>
            
            {/* Nút Tạo sự kiện trỏ vào trang đăng ký đại lý (/agency) */}
            <Link href="/agency" className="navbar-create-btn">
              {t('nav.create_event')}
            </Link>

            {/* Nút Vé của tôi (Không có icon) */}
            <Link href={loggedIn ? "/my-tickets" : "/login"} className="navbar-tickets-link">
              {t('nav.my_tickets')}
            </Link>

            {/* Cụm Đăng nhập / Đăng ký hoặc Dropdown User */}
            {loggedIn ? (
              <>
                {/* Notification Bell */}
                <div ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button onClick={toggleNotif} style={{
                    background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
                    padding: '0.35rem', display: 'flex', alignItems: 'center', color: '#fff',
                    fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem'
                  }}>
                    {t('nav.notifications')}
                    {unreadCount > 0 && (
                      <span style={{
                        marginLeft: '5px', background: '#ef4444', color: '#fff',
                        borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                      }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>

                  {showNotif && (
                    <div style={{
                      position: 'absolute', top: '130%', right: 0, width: 320, maxHeight: 400,
                      background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow-lg)',
                      border: '1px solid var(--border)', zIndex: 1000, overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{t('nav.notifications')}</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} style={{
                            background: 'none', border: 'none', color: 'var(--primary)',
                            fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500
                          }}>{t('nav.read_all')}</button>
                        )}
                      </div>
                      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {t('nav.no_new_notifications')}
                          </div>
                        ) : notifications.slice(0, 10).map(n => (
                          <div key={n.id} style={{
                            padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                            background: n.isRead ? 'var(--bg-card)' : 'var(--primary-glow)', cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4, textAlign: 'left' }}>{n.message}</p>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textAlign: 'left', marginTop: '4px' }}>{formatTimeAgo(n.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown User (Không có icon user) */}
                <div ref={userMenuRef} style={{ position: 'relative' }}>
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className="navbar-auth-text" style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.3rem 0'
                  }}>
                    {user?.fullName || t('nav.account')}
                    <span style={{ fontSize: '0.6rem', marginLeft: '2px' }}>▼</span>
                  </button>

                  {showUserMenu && (
                    <div style={{
                      position: 'absolute', top: '130%', right: 0, minWidth: 180,
                      background: 'var(--bg-card)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      border: '1px solid var(--border)', zIndex: 1000, overflow: 'hidden', marginTop: 6
                    }}>
                      {user?.role === 'ROLE_ADMIN' && (
                        <Link href="/admin" onClick={() => setShowUserMenu(false)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.7rem 1rem', textDecoration: 'none',
                          color: 'var(--primary)', fontWeight: 650, fontSize: '0.85rem',
                          borderBottom: '1px solid var(--border)', transition: 'background 0.15s'
                        }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'}
                           onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          {t('nav.admin_channel')}
                        </Link>
                      )}
                      {user?.role !== 'ROLE_ADMIN' && (
                        <Link href="/agency" onClick={() => setShowUserMenu(false)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.7rem 1rem', textDecoration: 'none',
                          color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem',
                          borderBottom: '1px solid var(--border)', transition: 'background 0.15s'
                        }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'}
                           onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          {user?.role === 'ROLE_ORGANIZER' ? t('nav.agency_channel') : t('nav.register_agency')}
                        </Link>
                      )}
                      <Link href="/profile" onClick={() => setShowUserMenu(false)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.7rem 1rem', textDecoration: 'none',
                        color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem',
                        borderBottom: '1px solid var(--border)', transition: 'background 0.15s'
                      }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'}
                         onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        {t('nav.profile')}
                      </Link>
                      <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                        padding: '0.7rem 1rem', border: 'none', background: 'transparent', textAlign: 'left',
                        color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                        transition: 'background 0.15s', fontFamily: 'inherit'
                      }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.05)'}
                         onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link href="/login" className="navbar-auth-text">{t('nav.login')}</Link>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>|</span>
                <Link href="/register" className="navbar-auth-text">{t('nav.register')}</Link>
              </div>
            )}

            {/* Nút chuyển ngôn ngữ EN / VN truyền thống màu trắng */}
            <button onClick={toggleLang} title={t('common.language_toggle')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', 
              color: '#ffffff', fontWeight: 750, fontSize: '0.85rem', fontFamily: 'inherit'
            }}>
              {lang === 'vi' ? 'EN' : 'VN'}
            </button>
          </div>
        </nav>

        {/* SUB-NAVBAR MÀU ĐEN CHỨA CÁC CHỨC NĂNG CHÍNH CỦA WEBSITE */}
        <div className="sub-navbar">
          <div className="sub-navbar-container">
            <Link href="/" className={`sub-navbar-link ${pathname === '/' ? 'active' : ''}`}>{t('nav.home')}</Link>
            <Link href="/events" className={`sub-navbar-link ${pathname === '/events' ? 'active' : ''}`}>{t('nav.explore')}</Link>
            <Link href="/calendar" className={`sub-navbar-link ${pathname === '/calendar' ? 'active' : ''}`}>{t('nav.calendar')}</Link>
            <Link href="/buddies" className={`sub-navbar-link ${pathname === '/buddies' ? 'active' : ''}`}>{t('nav.buddies')}</Link>
          </div>
        </div>

      </div>
      
      {/* Spacer để đẩy phần tiếp theo xuống 112px (64px navbar + 48px sub-navbar) */}
      <div style={{ height: '112px' }} />
    </>
  );
}
