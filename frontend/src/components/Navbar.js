'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { isLoggedIn, getUser, removeToken, apiRequest } from '@/lib/api';
import { icons } from './Icons';
import { useTranslation } from '@/context/TranslationContext';

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [theme, setTheme] = useState('light');
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const { lang, changeLang, t } = useTranslation();
  const pathname = usePathname();

  const navLinkStyle = (href) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return active ? {
      color: 'var(--primary)', fontWeight: 700,
      borderBottom: '2px solid var(--primary)',
      paddingBottom: '2px'
    } : {};
  };

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setUser(getUser());
    if (isLoggedIn()) {
      loadUnreadCount();
    }
    
    // Load theme Preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!d) return '';
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleLang = () => {
    changeLang(lang === 'vi' ? 'en' : 'vi');
  };

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <span style={{ display: 'inline-flex', color: 'var(--primary)' }}>{icons.ticket(22)}</span> TRIVENT
      </Link>

      <div className="navbar-links">
        <Link href="/" style={navLinkStyle('/')}>{t('nav.home')}</Link>
        <Link href="/events" style={navLinkStyle('/events')}>{t('nav.events')}</Link>
        {loggedIn && <Link href="/my-tickets" style={navLinkStyle('/my-tickets')}>{t('nav.my_tickets')}</Link>}
        {loggedIn && <Link href="/my-orders" style={navLinkStyle('/my-orders')}>{t('nav.orders')}</Link>}
        {loggedIn && <Link href="/buddies" style={navLinkStyle('/buddies')}>{t('nav.buddies')}</Link>}
        <Link href="/calendar" style={navLinkStyle('/calendar')}>{t('nav.calendar')}</Link>
      </div>

      <div className="navbar-auth">
        <button onClick={toggleLang} title={t('common.language_toggle')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem'
        }}>
          {lang === 'vi' ? 'VN' : 'EN'}
        </button>

        <button onClick={toggleTheme} title={t('common.theme_toggle')} style={{
          background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.4rem', color: 'var(--text-secondary)'
        }}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {loggedIn ? (
          <>
            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={toggleNotif} style={{
                background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
                padding: '0.35rem', display: 'flex', alignItems: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff',
                    borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotif && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, width: 320, maxHeight: 400,
                  background: 'var(--bg-card)', borderRadius: 12, boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border)', zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('nav.notifications')}</span>
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
                        {t('nav.no_notifications')}
                      </div>
                    ) : notifications.slice(0, 10).map(n => (
                      <div key={n.id} style={{
                        padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                        background: n.isRead ? 'var(--bg-card)' : 'var(--primary-glow)', cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatTimeAgo(n.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/favorites" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
              {t('nav.favorites')}
            </Link>
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0'
              }}>
                {icons.user(16, 'currentColor')}
                {user?.fullName || 'User'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, minWidth: 180,
                  background: 'var(--bg-card)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid var(--border)', zIndex: 1000, overflow: 'hidden', marginTop: 6
                }}>
                  {user?.role === 'ROLE_ADMIN' && (
                    <Link href="/admin" onClick={() => setShowUserMenu(false)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.7rem 1rem', textDecoration: 'none',
                      color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem',
                      borderBottom: '1px solid var(--border)', transition: 'background 0.15s'
                    }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'}
                       onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      {icons.crown(15, 'var(--primary)')} Quản trị
                    </Link>
                  )}
                  <Link href="/profile" onClick={() => setShowUserMenu(false)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.7rem 1rem', textDecoration: 'none',
                    color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem',
                    transition: 'background 0.15s'
                  }} onMouseEnter={e => e.currentTarget.style.background='var(--primary-glow)'}
                     onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    {icons.user(15, 'var(--text-secondary)')} Hồ sơ cá nhân
                  </Link>
                </div>
              )}
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-outline btn-sm">{t('nav.login')}</Link>
            <Link href="/register" className="btn btn-primary btn-sm">{t('nav.register')}</Link>
          </>
        )}
      </div>
    </nav>
  );
}
