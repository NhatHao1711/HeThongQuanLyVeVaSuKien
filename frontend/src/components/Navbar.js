'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { isLoggedIn, getUser, removeToken, apiRequest, API_BASE } from '@/lib/api';
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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }} suppressHydrationWarning>
        <nav className="navbar" style={{ height: '64px', position: 'static', padding: 0 }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', width: '100%' }}>
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
            
            {/* Nút Tạo sự kiện trỏ vào trang đăng ký đại lý (/agency) hoặc Admin */}
            <Link href={user?.role === 'ROLE_ADMIN' ? "/admin" : "/agency"} className="navbar-create-btn">
              {user?.role === 'ROLE_ADMIN' ? "Trang Quản Trị" : t('nav.create_event')}
            </Link>

            {/* Nút Vé của tôi (có icon ticket như Ticketbox) */}
            <Link href={loggedIn ? "/my-tickets?view=tickets" : "/login"} className="navbar-tickets-link" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5v2"/><path d="M15 11v2"/><path d="M15 17v2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/>
              </svg>
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
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.3rem 0', color: '#fff', fontWeight: 600
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user?.avatarUrl || user?.avatar ? (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden' }}>
                          <img src={user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      )}
                    </div>
                    {user?.fullName || t('nav.account')}
                    <span style={{ fontSize: '0.6rem', marginLeft: '2px' }}>▼</span>
                  </button>

                  {showUserMenu && (
                    <div style={{
                      position: 'absolute', top: '130%', right: 0, minWidth: 180,
                      background: 'var(--bg-card)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      border: '1px solid var(--border)', zIndex: 1000, overflow: 'hidden', marginTop: 6
                    }}>
                      {user?.role === 'ROLE_ADMIN' ? (
                        <Link href="/admin" onClick={() => setShowUserMenu(false)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem', textDecoration: 'none',
                          color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', transition: 'background 0.15s'
                        }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                          Trang Quản Trị
                        </Link>
                      ) : (
                        <Link href="/agency" onClick={() => setShowUserMenu(false)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem', textDecoration: 'none',
                          color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', transition: 'background 0.15s'
                        }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                          {user?.role === 'ROLE_ORGANIZER' ? "Kênh Đại Lý" : "Đăng ký Đại Lý"}
                        </Link>
                      )}
                      <Link href="/profile" onClick={() => setShowUserMenu(false)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem', textDecoration: 'none',
                        color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem', transition: 'background 0.15s'
                      }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Tài khoản của tôi
                      </Link>
                      <Link href="/my-tickets?view=orders" onClick={() => setShowUserMenu(false)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 1rem', textDecoration: 'none',
                        color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem', borderBottom: '1px solid var(--border)', transition: 'background 0.15s'
                      }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2"/><path d="M15 11v2"/><path d="M15 17v2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>
                        Đơn hàng của tôi
                      </Link>
                      <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                        padding: '0.7rem 1rem', border: 'none', background: 'transparent', textAlign: 'left',
                        color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer',
                        transition: 'background 0.15s', fontFamily: 'inherit'
                      }} onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.03)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Đăng xuất
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
