'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { apiRequest, isLoggedIn } from '@/lib/api';
import { icons } from '@/components/Icons';

export default function ProfilePage() {
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
        setForm({ fullName: res.data.fullName || '', phone: res.data.phone || '' });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const res = await apiRequest('/profile', { method: 'PUT', body: JSON.stringify(form) });
      if (res.success) { setMsg('Cập nhật thành công!'); setEditing(false); loadProfile(); }
      else setMsg('Lỗi: ' + res.message);
    } catch (e) { setMsg('Lỗi kết nối'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg('Mật khẩu mới không khớp'); return;
    }
    try {
      const res = await apiRequest('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      });
      if (res.success) {
        setPwMsg('Đổi mật khẩu thành công!');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPwForm(false);
      } else setPwMsg('Lỗi: ' + res.message);
    } catch (e) { setPwMsg('Lỗi kết nối'); }
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
  if (!profile) return (<><Navbar /><div style={{ textAlign: 'center', padding: '4rem' }}><p>Vui lòng <Link href="/login">đăng nhập</Link></p></div></>);

  const API_BASE = 'http://localhost:8080';

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', background: 'var(--bg-secondary)', padding: '2rem 0' }}>
        <div className="container" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Trang chủ</Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ color: 'var(--text-muted)' }}>Hồ sơ cá nhân</span>
          </div>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Quay lại</Link>

          <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', marginTop: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', margin: '0 auto',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: '#fff'
                }}>
                  {profile.avatarUrl
                    ? <img src={API_BASE + profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : profile.fullName?.charAt(0)?.toUpperCase() || icons.user(40, '#fff')}
                </div>
                <label style={{
                  position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  {icons.camera(16, '#fff')}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <h2 style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>{profile.fullName}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{profile.email}</p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem',
                background: profile.role === 'ROLE_ADMIN' ? 'rgba(255,107,53,0.1)' : 'rgba(76,175,80,0.1)',
                color: profile.role === 'ROLE_ADMIN' ? '#ff6b35' : '#4caf50', fontWeight: 600, marginTop: '0.5rem'
              }}>
                {profile.role === 'ROLE_ADMIN' ? <>{icons.crown(14, '#ff6b35')} Admin</> : <>{icons.user(14, '#4caf50')} User</>}
              </span>
            </div>

            {msg && <div style={{ padding: '0.75rem', borderRadius: 8, background: msg.includes('thành công') ? '#e8f5e9' : '#fbe9e7', textAlign: 'center', marginBottom: '1rem' }}>{msg}</div>}

            <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {icons.clipboardList(18)} Thông tin cá nhân
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Họ và tên</label>
                  {editing
                    ? <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem' }} />
                    : <p style={{ fontWeight: 500 }}>{profile.fullName}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Email</label>
                  <p style={{ fontWeight: 500 }}>{profile.email}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Số điện thoại</label>
                  {editing
                    ? <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="Nhập số điện thoại"
                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem' }} />
                    : <p style={{ fontWeight: 500 }}>{profile.phone || 'Chưa cập nhật'}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Trường đại học</label>
                  <p style={{ fontWeight: 500 }}>{profile.universityName || 'Chưa liên kết'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Ngày tham gia</label>
                  <p style={{ fontWeight: 500 }}>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : ''}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                {editing ? (
                  <>
                    <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      {icons.save(16, '#fff')} Lưu thay đổi
                    </button>
                    <button onClick={() => setEditing(false)} className="btn btn-outline" style={{ flex: 1 }}>Hủy</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)} className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      {icons.edit(16, '#fff')} Chỉnh sửa
                    </button>
                    <button onClick={() => setShowPwForm(!showPwForm)} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      {icons.lock(16)} Đổi mật khẩu
                    </button>
                  </>
                )}
              </div>
            </div>

            {showPwForm && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {icons.lock(18)} Đổi mật khẩu
                </h3>
                {pwMsg && <div style={{ padding: '0.75rem', borderRadius: 8, background: pwMsg.includes('thành công') ? '#e8f5e9' : '#fbe9e7', textAlign: 'center', marginBottom: '1rem' }}>{pwMsg}</div>}
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <input type="password" placeholder="Mật khẩu hiện tại" value={pwForm.currentPassword}
                    onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                  <input type="password" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" value={pwForm.newPassword}
                    onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                  <input type="password" placeholder="Xác nhận mật khẩu mới" value={pwForm.confirmPassword}
                    onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                  <button onClick={handleChangePassword} className="btn btn-primary">Đổi mật khẩu</button>
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
