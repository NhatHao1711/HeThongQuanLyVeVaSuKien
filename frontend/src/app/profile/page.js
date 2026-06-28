'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { apiRequest, isLoggedIn, setUser } from '@/lib/api';
import { icons } from '@/components/Icons';
import { useTranslation } from '@/context/TranslationContext';

export default function ProfilePage() {
  const { lang, t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await apiRequest('/profile');
      if (res.success) {
        setProfile(res.data);
        setUser(res.data);
        setForm({ fullName: res.data.fullName || '', phone: res.data.phone || '' });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const res = await apiRequest('/profile', { method: 'PUT', body: JSON.stringify(form) });
      if (res.success) { setMsg(t('profile.save_success')); setEditing(false); loadProfile(); }
      else setMsg(t('profile.save_fail') + ': ' + res.message);
    } catch (e) { setMsg(t('common.error_connect')); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg(t('profile.pwd_mismatch')); return;
    }
    try {
      const res = await apiRequest('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      });
      if (res.success) {
        setPwMsg(t('profile.pwd_success'));
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPwForm(false);
      } else setPwMsg(t('profile.pwd_fail') + ': ' + res.message);
    } catch (e) { setPwMsg(t('common.error_connect')); }
    setTimeout(() => setPwMsg(''), 3000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8080/api/profile/avatar', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      const data = await res.json();
      if (data.success) loadProfile();
    } catch (e) { console.error(e); }
  };

  if (loading) return (<><Navbar /><div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div></div></>);
  if (!profile) return (<><Navbar /><div style={{ textAlign: 'center', padding: '4rem' }}><p><Link href="/login" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{t('profile.login_required')}</Link></p></div></>);

  const API_BASE = 'http://localhost:8080';

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', background: 'var(--bg-secondary)', padding: '2rem 0' }}>
        <div className="container" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{t('nav.home')}</Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ color: 'var(--text-muted)' }}>{t('profile.title')}</span>
          </div>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← {t('common.back')}</Link>

          <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', marginTop: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', margin: '0 auto',
                  background: profile.avatarUrl ? 'transparent' : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {profile.avatarUrl
                    ? <img src={API_BASE + profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="#94a3b8" style={{ marginTop: '12px' }}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                    )}
                </div>
                <label style={{
                  position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontWeight: 'bold'
                }}>
                  +
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <h2 style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>{profile.fullName}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{profile.email}</p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem',
                background: profile.role === 'ROLE_ADMIN' 
                  ? 'rgba(255,107,53,0.1)' 
                  : profile.role === 'ROLE_ORGANIZER' 
                    ? 'rgba(14,165,233,0.1)' 
                    : 'rgba(76,175,80,0.1)',
                color: profile.role === 'ROLE_ADMIN' 
                  ? '#ff6b35' 
                  : profile.role === 'ROLE_ORGANIZER' 
                    ? '#0ea5e9' 
                    : '#4caf50', 
                fontWeight: 600, marginTop: '0.5rem'
              }}>
                {profile.role === 'ROLE_ADMIN' 
                  ? t('profile.role_admin') 
                  : profile.role === 'ROLE_ORGANIZER' 
                    ? t('profile.role_organizer') 
                    : t('profile.role_user')}
              </span>
            </div>

            {msg && <div style={{ padding: '0.75rem', borderRadius: 8, background: (msg.includes('thành công') || msg.toLowerCase().includes('success')) ? '#e8f5e9' : '#fbe9e7', textAlign: 'center', marginBottom: '1rem' }}>{msg}</div>}

            <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {t('profile.tab_info')}
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>{t('profile.fullname')}</label>
                  {editing
                    ? <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem' }} />
                    : <p style={{ fontWeight: 500 }}>{profile.fullName}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>{t('profile.email')}</label>
                  <p style={{ fontWeight: 500 }}>{profile.email}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>{t('profile.phone')}</label>
                  {editing
                    ? <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder={t('auth.phone_placeholder')}
                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem' }} />
                    : <p style={{ fontWeight: 500 }}>{profile.phone || t('profile.unupdated')}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>{t('profile.university')}</label>
                  <p style={{ fontWeight: 500 }}>{profile.universityName || t('profile.unlinked')}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>{t('profile.joined_date')}</label>
                  <p style={{ fontWeight: 500 }}>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : ''}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                {editing ? (
                  <>
                    <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      {t('common.save')}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn btn-outline" style={{ flex: 1 }}>{t('common.cancel')}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      {t('profile.edit_btn')}
                    </button>
                    <button onClick={() => setShowPwForm(!showPwForm)} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      {t('profile.tab_pwd')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {showPwForm && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {t('profile.tab_pwd')}
                </h3>
                {pwMsg && <div style={{ padding: '0.75rem', borderRadius: 8, background: (pwMsg.includes('thành công') || pwMsg.toLowerCase().includes('success')) ? '#e8f5e9' : '#fbe9e7', textAlign: 'center', marginBottom: '1rem' }}>{pwMsg}</div>}
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <input type="password" placeholder={t('profile.pwd_current_placeholder')} value={pwForm.currentPassword}
                    onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                  <input type="password" placeholder={t('profile.pwd_new_placeholder')} value={pwForm.newPassword}
                    onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                  <input type="password" placeholder={t('profile.pwd_confirm_placeholder')} value={pwForm.confirmPassword}
                    onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                  <button onClick={handleChangePassword} className="btn btn-primary">{t('profile.tab_pwd')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
