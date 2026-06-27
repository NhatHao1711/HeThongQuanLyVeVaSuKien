'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiRequest, setToken, setUser } from '@/lib/api';
import { useTranslation } from '@/context/TranslationContext';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('auth.pwd_not_match'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        }),
      });

      if (res.success) {
        setToken(res.data.token);
        setUser({
          userId: res.data.userId,
          fullName: res.data.fullName,
          email: res.data.email,
          role: res.data.role,
          agencyStatus: res.data.agencyStatus,
        });
        window.location.href = '/';
      } else {
        setError(res.message || t('auth.register_fail'));
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
        <div className="hero-orb hero-orb-2"></div>
        <div className="form-card animate-in">
          <Link href="/" style={{ color: 'var(--primary)', fontSize: '0.88rem', display: 'block', marginBottom: '1rem' }}>← {t('nav.home')}</Link>
          <h2>{t('auth.register_title')}</h2>
          <p className="subtitle">{t('auth.register_subtitle')}</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('auth.fullname')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('auth.fullname_placeholder')}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
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
                placeholder={t('profile.pwd_new_placeholder')}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.confirm_password')}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t('auth.confirm_password_placeholder')}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <span className="spinner"></span> : t('auth.create_account')}
            </button>
          </form>

          <p className="form-divider">{t('auth.have_account')}</p>
          <Link href="/login" className="btn btn-outline btn-block">
            {t('auth.login_title')}
          </Link>
        </div>
      </section>
    </>
  );
}
