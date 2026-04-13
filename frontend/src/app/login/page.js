'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiRequest, setToken, setUser } from '@/lib/api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        setError(res.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Không thể kết nối đến server');
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
          <Link href="/" style={{ color: 'var(--primary)', fontSize: '0.88rem', display: 'block', marginBottom: '1rem' }}>← Về trang chủ</Link>
          <h2>Đăng nhập</h2>
          <p className="subtitle">Chào mừng bạn quay trở lại TRIVENT</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@university.edu.vn"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Đăng nhập'}
            </button>
          </form>

          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <Link href="/forgot-password" style={{ color: '#6b7280', fontSize: '0.85rem', textDecoration: 'none' }}>
              Quên mật khẩu?
            </Link>
          </div>
          <p className="form-divider">Chưa có tài khoản?</p>
          <Link href="/register" className="btn btn-outline btn-block">
            Đăng ký miễn phí
          </Link>
        </div>
      </section>
    </>
  );
}
