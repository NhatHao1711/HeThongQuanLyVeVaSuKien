'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiRequest, setToken, setUser } from '@/lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
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
        });
        window.location.href = '/';
      } else {
        setError(res.message || 'Đăng ký thất bại!');
      }
    } catch (err) {
      setError('Không thể kết nối server!');
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
          <Link href="/" style={{ color: 'var(--primary)', fontSize: '0.88rem', display: 'block', marginBottom: '1rem' }}>← Về trang chủ</Link>
          <h2>Đăng ký</h2>
          <p className="subtitle">Tham gia cộng đồng sinh viên TRIVENT</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nguyễn Văn A"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email sinh viên</label>
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
                placeholder="Ít nhất 6 ký tự"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="form-input"
                placeholder="Nhập lại mật khẩu"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="form-divider">Đã có tài khoản?</p>
          <Link href="/login" className="btn btn-outline btn-block">
            Đăng nhập
          </Link>
        </div>
      </section>
    </>
  );
}
