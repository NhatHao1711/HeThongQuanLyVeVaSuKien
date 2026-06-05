'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiRequest, setToken, setUser } from '@/lib/api';
import { useTranslation } from '@/context/TranslationContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      if (res.success) {
        setToken(res.data.token);
        setUser({
          userId: res.data.userId,
          fullName: res.data.fullName,
          email: res.data.email,
          role: res.data.role,
        });
        window.location.href = res.data.role === 'ROLE_ADMIN' ? '/admin' : '/';
      } else {
        setError(res.message || t('auth.login_fail'));
      }
    } catch (err) {
      setError(t('common.error_connect'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <section className="hero" style={{ minHeight: '100vh' }}>
        <div className="hero-orb hero-orb-1"></div>
        <div className="form-card animate-in">
          <Link href="/" style={{ color: 'var(--primary)', fontSize: '0.88rem', display: 'block', marginBottom: '1rem' }}>← {t('nav.home')}</Link>
          <h2>{t('auth.login_title')}</h2>
          <p className="subtitle">{t('auth.login_subtitle')}</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <input
                type="email"
                className="form-input"
                placeholder={t('auth.email_placeholder')}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t('auth.password_placeholder')}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <span className="spinner"></span> : t('auth.login_title')}
            </button>
          </form>

          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <Link href="/forgot-password" style={{ color: '#6b7280', fontSize: '0.85rem', textDecoration: 'none' }}>
              {t('auth.forgot_password')}
            </Link>
          </div>
          <p className="form-divider">{t('auth.no_account')}</p>
          <Link href="/register" className="btn btn-outline btn-block">
            {t('auth.register_free')}
          </Link>
        </div>
      </section>
    </>
  );
}
