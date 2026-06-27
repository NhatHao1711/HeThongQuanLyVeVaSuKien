'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest } from '@/lib/api';
import { icons } from '@/components/Icons';
import { useTranslation } from '@/context/TranslationContext';

export default function FavoritesPage() {
  const { lang, t } = useTranslation();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFavorites(); }, []);

  const loadFavorites = async () => {
    try {
      const res = await apiRequest('/favorites');
      if (res.success) setFavorites(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const removeFavorite = async (eventId) => {
    try {
      await apiRequest(`/favorites/${eventId}`, { method: 'POST' });
      setFavorites(prev => prev.filter(f => f.eventId !== eventId));
    } catch (e) { console.error(e); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const API_BASE = 'http://localhost:8080';

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', background: 'var(--bg-secondary)', padding: '2rem 0' }}>
        <div className="container" style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{t('nav.home')}</Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ color: 'var(--text-muted)' }}>{t('favorites.title')}</span>
          </div>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← {t('common.back')}</Link>

          <h1 style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {t('favorites.title')}
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>{t('favorites.subtitle')}</p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
            </div>
          ) : favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('favorites.no_favorites')}</p>
              <Link href="/events" className="btn btn-primary">{t('favorites.explore_btn')}</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {favorites.map(fav => (
                <div key={fav.eventId} style={{
                  background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'transform 0.2s'
                }}>
                  <div style={{
                    width: 200, minHeight: 140,
                    background: fav.imageUrl ? `url(${API_BASE}${fav.imageUrl}) center/cover` : 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {!fav.imageUrl && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>TRIVENT</span>}
                  </div>
                  <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <Link href={`/events/${fav.eventId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{fav.title}</h3>
                      </Link>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {fav.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>Địa điểm: {fav.location}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>Thời gian: {formatDate(fav.startTime)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/events/${fav.eventId}`} className="btn btn-primary btn-sm">{t('favorites.view_detail')}</Link>
                        <button onClick={() => removeFavorite(fav.eventId)} 
                          style={{ background: 'none', border: '1px solid #e57373', color: '#e57373', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          {t('favorites.remove_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
