'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<><Navbar /><div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh'}}><div className="spinner"></div></div></>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự!' });
      return;
    }
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch('http://localhost:8080/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: '✅ Đặt lại mật khẩu thành công! Hãy đăng nhập lại.' });
      } else {
        setMsg({ type: 'error', text: data.message || 'Link hết hạn hoặc không hợp lệ' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <Navbar />
        <main style={{ paddingTop: '100px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontWeight: 700, color: '#1a1a2e' }}>Link không hợp lệ</h2>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Vui lòng sử dụng link được gửi qua email.</p>
            <Link href="/forgot-password" style={{ color: '#00B46E', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '1rem' }}>
              Yêu cầu link mới →
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '100px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20,
          padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1a2e' }}>Đặt lại mật khẩu</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Nhập mật khẩu mới cho tài khoản
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
              {msg.type === 'success' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <Link href="/login" style={{ color: '#00B46E', fontWeight: 700, textDecoration: 'none' }}>
                    Đăng nhập ngay →
                  </Link>
                </div>
              )}
            </div>
          )}

          {msg.type !== 'success' && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: '#374151' }}>
                  Mật khẩu mới
                </label>
                <input
                  type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  minLength={6}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid #e2e8f0',
                    fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#00B46E'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: '#374151' }}>
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid #e2e8f0',
                    fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box'
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
                  fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '⏳ Đang xử lý...' : '🔐 Đặt lại mật khẩu'}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
