'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch('http://localhost:8080/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: '✅ Nếu email tồn tại, bạn sẽ nhận được hướng dẫn qua email. Hãy kiểm tra hòm thư!' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Có lỗi xảy ra' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '100px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20,
          padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1a2e' }}>Quên mật khẩu</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Nhập email để nhận link đặt lại mật khẩu
            </p>
          </div>

          {msg.text && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem',
              background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: msg.type === 'success' ? '#059669' : '#dc2626',
              fontSize: '0.85rem', fontWeight: 500
            }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: '#374151' }}>
                Email
              </label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid #e2e8f0',
                  fontSize: '0.92rem', outline: 'none', transition: 'border 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#00B46E'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: 12, border: 'none',
                background: loading ? '#a0aec0' : '#00B46E', color: '#fff', fontWeight: 700,
                fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? '⏳ Đang gửi...' : '📧 Gửi link đặt lại mật khẩu'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link href="/login" style={{ color: '#00B46E', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              ← Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
