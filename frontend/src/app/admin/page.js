'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiRequest, isLoggedIn, getUser } from '@/lib/api';
import { icons } from '@/components/Icons';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAddTicket, setShowAddTicket] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [seatManagerTicket, setSeatManagerTicket] = useState(null);
  const [seatConfig, setSeatConfig] = useState({ rows: 10, cols: 10 });
  const [seatLoading, setSeatLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);

  const [eventForm, setEventForm] = useState({ title: '', description: '', location: '', startTime: '', endTime: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ticketForm, setTicketForm] = useState({ name: '', price: '', totalQuantity: '' });
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Stats & Voucher state
  const [revenueStats, setRevenueStats] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [voucherForm, setVoucherForm] = useState({ code: '', description: '', discountPercent: '', discountAmount: '', maxUses: '', expiryDate: '' });

  useEffect(() => {
    const user = getUser();
    if (!isLoggedIn() || user?.role !== 'ROLE_ADMIN') { router.push('/login'); return; }
    loadAll();
  }, []);

  // Auto-load stats and vouchers when switching tabs
  useEffect(() => {
    if (activeTab === 'stats' && !revenueStats) {
      apiRequest('/admin/stats/revenue').then(res => { if (res.success) setRevenueStats(res.data); });
    }
    if (activeTab === 'vouchers' && vouchers.length === 0) {
      apiRequest('/vouchers/admin').then(res => { if (res.success) setVouchers(res.data); });
    }
  }, [activeTab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, e, o] = await Promise.all([
        apiRequest('/admin/stats'), apiRequest('/admin/users'),
        apiRequest('/admin/events'), apiRequest('/admin/orders'),
      ]);
      if (s.success) setStats(s.data);
      if (u.success) setUsers(u.data);
      if (e.success) setEvents(e.data);
      if (o.success) setOrders(o.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const confirmPayment = async (orderId) => {
    setConfirmDialog({
      show: true,
      title: '✅ Xác nhận thanh toán',
      message: `Bạn có chắc muốn xác nhận đã nhận thanh toán cho đơn hàng #${orderId}?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          const res = await apiRequest(`/admin/orders/${orderId}/confirm`, { method: 'PUT' });
          if (res.success) { showMsg('success', 'Đã xác nhận thanh toán!'); loadAll(); }
          else showMsg('error', res.message);
        } catch (e) { showMsg('error', 'Lỗi kết nối'); }
      }
    });
  };

  const rejectPayment = async (orderId) => {
    setConfirmDialog({
      show: true,
      title: '❌ Từ chối thanh toán',
      message: `Bạn có chắc muốn từ chối thanh toán cho đơn hàng #${orderId}?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          const res = await apiRequest(`/admin/orders/${orderId}/reject`, { method: 'PUT' });
          if (res.success) { showMsg('success', 'Đã từ chối thanh toán'); loadAll(); }
          else showMsg('error', res.message);
        } catch (e) { showMsg('error', 'Lỗi kết nối'); }
      }
    });
  };

  const uploadEventImage = async (eventId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8080/api/events/admin/${eventId}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) { showMsg('success', 'Upload ảnh thành công!'); }
      else showMsg('error', data.message);
    } catch (e) { showMsg('error', 'Lỗi upload ảnh'); }
  };

  const showMsg = (type, text) => { setFormMsg({ type, text }); setTimeout(() => setFormMsg({ type: '', text: '' }), 4000); };
  const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '-';
  const formatMoney = (v) => v != null ? Number(v).toLocaleString('vi-VN') + 'đ' : '-';

  const exportOrdersCSV = () => {
    if (!orders || orders.length === 0) {
      alert('Không có dữ liệu để xuất');
      return;
    }
    
    // CSV Header
    let csvContent = 'ID,Ma Giao Dich,Khach Hang,Email,Tong Tien,Thanh Toan,Trang Thai,Ngay Tao\n';
    
    orders.forEach(o => {
      const row = [
        o.id,
        o.transactionId || '',
        o.user ? `"${o.user.fullName}"` : '',
        o.user ? `"${o.user.email}"` : '',
        o.totalAmount,
        o.paymentStatus,
        o.status,
        new Date(o.createdAt).toLocaleString('vi-VN')
      ].join(',');
      csvContent += row + '\n';
    });
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `don_hang_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ===== EVENT CRUD =====
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImageSelection = () => { setSelectedImage(null); setImagePreview(null); };

  const createEvent = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const res = await apiRequest('/events/admin/create', { method: 'POST', body: JSON.stringify(eventForm) });
      if (res.success) {
        // Upload image if selected
        if (selectedImage && res.data?.id) {
          await uploadEventImage(res.data.id, selectedImage);
        }
        showMsg('success', 'Tạo sự kiện thành công!');
        setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '' });
        clearImageSelection();
        setShowCreateEvent(false);
        await loadAll();
      }
      else showMsg('error', res.message || 'Lỗi');
    } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
  };

  const startEditEvent = (ev) => {
    setEditingEvent(ev.id);
    setEventForm({ title: ev.title || '', description: ev.description || '', location: ev.location || '', startTime: ev.startTime ? ev.startTime.substring(0, 16) : '', endTime: ev.endTime ? ev.endTime.substring(0, 16) : '' });
    clearImageSelection();
    if (ev.imageUrl) setImagePreview(`http://localhost:8080${ev.imageUrl}`);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const saveEditEvent = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const res = await apiRequest(`/events/admin/${editingEvent}`, { method: 'PUT', body: JSON.stringify(eventForm) });
      if (res.success) {
        if (selectedImage) await uploadEventImage(editingEvent, selectedImage);
        showMsg('success', 'Đã cập nhật');
        setEditingEvent(null);
        clearImageSelection();
        await loadAll();
      }
      else showMsg('error', res.message || 'Lỗi');
    } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
  };

  const publishEvent = async (id) => { await apiRequest(`/events/admin/${id}/publish`, { method: 'POST' }); await loadAll(); showMsg('success', 'Đã publish!'); };
  const closeEvent = async (id) => { await apiRequest(`/events/admin/${id}/close`, { method: 'POST' }); await loadAll(); showMsg('success', 'Đã đóng!'); };
  const deleteEvent = (id) => {
    setConfirmDialog({
      show: true,
      title: '🗑️ Xóa sự kiện',
      message: 'Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          const res = await apiRequest(`/events/admin/${id}`, { method: 'DELETE' });
          if (res.success) { showMsg('success', 'Đã xóa sự kiện!'); await loadAll(); }
          else showMsg('error', res.message || 'Lỗi khi xóa');
        } catch (e) { showMsg('error', 'Lỗi kết nối'); }
      }
    });
  };

  const sendMarketingEmail = (id) => {
    setConfirmDialog({
      show: true,
      title: '✉️ Gửi email quảng bá',
      message: 'Gửi email quảng bá sự kiện này đến TẤT CẢ người dùng? Email sẽ được gửi ngay lập tức.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setFormLoading(true);
        try {
          const res = await apiRequest(`/events/admin/${id}/marketing`, { method: 'POST' });
          if (res.success) showMsg('success', 'Đã Gửi Email Quảng Bá!');
          else showMsg('error', res.message);
        } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
      }
    });
  };

  // ===== TICKET TYPE CRUD =====
  const addTicketType = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const res = await apiRequest(`/events/admin/${showAddTicket}/add-ticket-type`, { method: 'POST', body: JSON.stringify({ name: ticketForm.name, price: Number(ticketForm.price), totalQuantity: Number(ticketForm.totalQuantity) }) });
      if (res.success) { setTicketForm({ name: '', price: '', totalQuantity: '' }); setShowAddTicket(null); await loadAll(); showMsg('success', 'Đã thêm vé'); }
      else showMsg('error', res.message || 'Lỗi');
    } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
  };

  const startEditTicket = (tt) => { setEditingTicket(tt.id); setTicketForm({ name: tt.name, price: tt.price, totalQuantity: tt.totalQuantity }); };

  const saveEditTicket = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const res = await apiRequest(`/events/admin/ticket-types/${editingTicket}`, { method: 'PUT', body: JSON.stringify({ name: ticketForm.name, price: Number(ticketForm.price), totalQuantity: Number(ticketForm.totalQuantity) }) });
      if (res.success) { setEditingTicket(null); setTicketForm({ name: '', price: '', totalQuantity: '' }); await loadAll(); showMsg('success', 'Đã cập nhật vé'); }
      else showMsg('error', res.message || 'Lỗi');
    } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
  };

  const deleteTicketType = (id) => {
    setConfirmDialog({
      show: true,
      title: '🗑️ Xóa loại vé',
      message: 'Bạn có chắc chắn muốn xóa loại vé này?',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await apiRequest(`/events/admin/ticket-types/${id}`, { method: 'DELETE' });
          await loadAll(); showMsg('success', 'Đã xóa loại vé');
        } catch (e) { showMsg('error', 'Lỗi kết nối'); }
      }
    });
  };

  // ===== USER CRUD =====
  const startEditUser = (u) => { setEditingUser(u.id); setUserForm({ fullName: u.fullName, email: u.email, password: '' }); };

  const saveEditUser = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const res = await apiRequest(`/admin/users/${editingUser}`, { method: 'PUT', body: JSON.stringify(userForm) });
      if (res.success) { setEditingUser(null); await loadAll(); showMsg('success', 'Đã cập nhật'); }
      else showMsg('error', res.message || 'Lỗi');
    } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
  };

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
    await apiRequest(`/admin/users/${id}/role?role=${newRole}`, { method: 'PUT' }); await loadAll(); showMsg('success', 'Đã đổi role');
  };
  const toggleVerify = async (id) => { await apiRequest(`/admin/users/${id}/verify`, { method: 'PUT' }); await loadAll(); };

  // ===== SEAT MANAGER =====
  const openSeatManager = async (tt) => {
    setSeatLoading(true);
    try {
      const res = await apiRequest(`/admin/ticket-types/${tt.id}/seats/count`);
      if (res.success) {
        setSeatManagerTicket({ id: tt.id, name: tt.name, seatCount: res.data.seatCount });
        setSeatConfig({ rows: 10, cols: 10 });
      }
    } catch (e) { showMsg('error', 'Lỗi tải thông tin ghế'); }
    finally { setSeatLoading(false); }
  };

  const generateSeats = async () => {
    setSeatLoading(true);
    try {
      const res = await apiRequest(`/admin/ticket-types/${seatManagerTicket.id}/seats/generate`, {
        method: 'POST',
        body: JSON.stringify({ rows: Number(seatConfig.rows), cols: Number(seatConfig.cols) })
      });
      if (res.success) {
        showMsg('success', res.message);
        setSeatManagerTicket(prev => ({ ...prev, seatCount: res.data.seatsCreated }));
      } else { showMsg('error', res.message); }
    } catch (e) { showMsg('error', 'Lỗi tạo ghế'); }
    finally { setSeatLoading(false); }
  };

  const deleteUser = (id) => {
    setConfirmDialog({
      show: true,
      title: '🗑️ Xóa người dùng',
      message: 'Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        try {
          await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
          await loadAll(); showMsg('success', 'Đã xóa người dùng');
        } catch (e) { showMsg('error', 'Lỗi kết nối'); }
      }
    });
  };

  // Styles
  const s = {
    page: { display: 'flex', minHeight: '100vh', paddingTop: 64, background: '#f5f7fa' },
    sidebar: { width: 240, background: '#fff', borderRight: '1px solid #e2e8f0', padding: '1.5rem 0', flexShrink: 0, position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto' },
    sidebarTitle: { padding: '0 1.2rem', fontSize: '0.75rem', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.8rem' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: active ? 600 : 400, color: active ? '#00B46E' : '#4a5568', background: active ? 'rgba(0,180,110,0.06)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: active ? '3px solid #00B46E' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left', fontFamily: 'inherit' }),
    main: { flex: 1, padding: '2rem', maxWidth: 1100, margin: '0 auto' },
    header: { marginBottom: '1.5rem' },
    headerTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#1a1a2e' },
    headerDesc: { fontSize: '0.88rem', color: '#a0aec0' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
    statCard: (color) => ({ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.5rem', borderTop: `3px solid ${color}` }),
    statLabel: { fontSize: '0.78rem', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 },
    statValue: (color) => ({ fontSize: '2rem', fontWeight: 800, color }),
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: '1rem', overflow: 'hidden' },
    cardHeader: { padding: '1rem 1.2rem', borderBottom: '1px solid #f0f0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardBody: { padding: '1.2rem' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #e2e8f0' },
    td: { padding: '10px 14px', fontSize: '0.85rem', color: '#4a5568', borderBottom: '1px solid #f5f5f5' },
    btn: (bg, color) => ({ padding: '6px 12px', background: bg, color, border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.2s' }),
    btnGroup: { display: 'flex', gap: 4 },
    badge: (bg, color) => ({ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: bg, color }),
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' },
    label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', marginBottom: 4 },
    ticketRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' },
  };

  const tabs = [
    { id: 'dashboard', label: 'Tổng quan' },
    { id: 'events', label: 'Sự kiện' },
    { id: 'users', label: 'Người dùng' },
    { id: 'orders', label: 'Đơn hàng' },
    { id: 'stats', label: 'Thống kê' },
    { id: 'vouchers', label: 'Voucher' },
  ];

  const checkinLink = (
    <Link href="/admin/checkin" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: 600, color: '#fff', background: '#00B46E', borderRadius: 8, margin: '1rem', textDecoration: 'none', justifyContent: 'center' }}>
      Quét QR Check-in
    </Link>
  );

  if (loading) return (<><Navbar /><div style={{ ...s.page, alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 40, height: 40 }}></div></div></>);

  // Inline event form rendering (NOT a sub-component to prevent remount/focus loss)
  const renderEventForm = (onSubmit, isEdit) => (
    <div style={s.card}>
      <div style={s.cardBody}>
        <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>{isEdit ? 'Sửa sự kiện' : 'Tạo sự kiện mới'}</h4>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.label}>Tên sự kiện</label>
            <input style={s.input} required placeholder="VD: Hội thảo AI 2026" value={eventForm.title} onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.label}>Mô tả</label>
            <textarea style={{ ...s.input, resize: 'vertical' }} required rows={3} value={eventForm.description} onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.label}>Địa điểm</label>
            <input style={s.input} required value={eventForm.location} onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))} />
          </div>
          <div style={s.formRow}>
            <div><label style={s.label}>Bắt đầu</label><input style={s.input} type="datetime-local" required value={eventForm.startTime} onChange={e => setEventForm(prev => ({ ...prev, startTime: e.target.value }))} /></div>
            <div><label style={s.label}>Kết thúc</label><input style={s.input} type="datetime-local" required value={eventForm.endTime} onChange={e => setEventForm(prev => ({ ...prev, endTime: e.target.value }))} /></div>
          </div>
          {/* Image Upload */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.label}>Hình ảnh sự kiện</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...s.btn('#e0f2fe', '#0284c7'), cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}>
                📸 {imagePreview ? 'Đổi ảnh' : 'Chọn ảnh'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
              </label>
              {imagePreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={imagePreview} alt="Preview" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8, border: '2px solid #e2e8f0' }} />
                  <button type="button" onClick={clearImageSelection} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>✕ Xoá ảnh</button>
                </div>
              )}
              {!imagePreview && <span style={{ fontSize: '0.82rem', color: '#a0aec0' }}>PNG, JPG, WEBP (tối đa 5MB)</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={s.btn('#00B46E', '#fff')} disabled={formLoading}>{formLoading ? '...' : (isEdit ? 'Lưu' : 'Tạo')}</button>
            <button type="button" style={s.btn('#f5f5f5', '#4a5568')} onClick={() => { setShowCreateEvent(false); setEditingEvent(null); clearImageSelection(); }}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <div style={s.page}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Quản trị</div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={s.navItem(activeTab === t.id)}>
              {t.label}
            </button>
          ))}
          {checkinLink}
          <div style={{ padding: '1.5rem 1.2rem 0', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>
            <Link href="/" style={{ fontSize: '0.85rem', color: '#a0aec0' }}>← Về trang chủ</Link>
          </div>
        </aside>

        {/* Main Content */}
        <main style={s.main}>
          {formMsg.text && <div className={`alert alert-${formMsg.type}`}>{formMsg.text}</div>}

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              <div style={s.header}>
                <h1 style={s.headerTitle}>Tổng quan</h1>
                <p style={s.headerDesc}>Thống kê hệ thống TRIVENT</p>
              </div>
              {stats && (
                <div style={s.statsRow}>
                  {[
                    { label: 'Người dùng', value: stats.totalUsers, color: '#3b82f6' },
                    { label: 'Sự kiện', value: stats.totalEvents, color: '#00B46E' },
                    { label: 'Đơn hàng', value: stats.totalOrders, color: '#f59e0b' },
                    { label: 'Vé đã bán', value: stats.totalTicketsSold, color: '#ef4444' },
                  ].map((st, i) => (
                    <div key={i} style={s.statCard(st.color)}>
                      <div style={s.statLabel}>{st.label}</div>
                      <div style={s.statValue(st.color)}>{st.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* EVENTS */}
          {activeTab === 'events' && (
            <>
              <div style={{ ...s.header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1 style={s.headerTitle}>Sự kiện ({events.length})</h1></div>
                <button style={s.btn('#00B46E', '#fff')} onClick={() => { setShowCreateEvent(!showCreateEvent); setEditingEvent(null); setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '' }); }}>
                  {showCreateEvent ? 'Đóng' : '+ Tạo sự kiện'}
                </button>
              </div>

              {showCreateEvent && renderEventForm(createEvent, false)}
              {editingEvent && !showCreateEvent && renderEventForm(saveEditEvent, true)}



              {events.map(ev => (
                <div key={ev.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      {/* Event Thumbnail */}
                      <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                        {ev.imageUrl ? (
                          <img src={`http://localhost:8080${ev.imageUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.5rem' }}>🎪</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ev.title}</span>
                          <span style={s.badge(
                            ev.status === 'PUBLISHED' ? 'rgba(0,180,110,0.1)' : ev.status === 'DRAFT' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                            ev.status === 'PUBLISHED' ? '#00B46E' : ev.status === 'DRAFT' ? '#3b82f6' : '#ef4444'
                          )}>{ev.status}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>📍 {ev.location}  ·  📅 {formatDate(ev.startTime)}</div>
                      </div>
                    </div>
                    <div style={s.btnGroup}>
                      <button style={s.btn('#f5f7fa', '#4a5568')} onClick={() => setExpandedEvent(expandedEvent === ev.id ? null : ev.id)}>Vé ({ev.ticketTypes?.length || 0})</button>
                      <button style={s.btn('#f5f7fa', '#4a5568')} onClick={() => startEditEvent(ev)}>Sửa</button>
                      {ev.status === 'DRAFT' && <button style={s.btn('#00B46E', '#fff')} onClick={() => publishEvent(ev.id)}>Publish</button>}
                      {(ev.status === 'PUBLISHED' || ev.status === 'ONGOING') && <button style={s.btn('#f59e0b', '#fff')} onClick={() => closeEvent(ev.id)}>Đóng</button>}
                      {(ev.status === 'PUBLISHED' || ev.status === 'ONGOING') && <button style={s.btn('#3b82f6', '#fff')} onClick={() => sendMarketingEmail(ev.id)} disabled={formLoading}>✉️ Gửi quảng bá</button>}
                      <button style={s.btn('#fee2e2', '#ef4444')} onClick={() => deleteEvent(ev.id)}>Xóa</button>
                    </div>
                  </div>

                  {expandedEvent === ev.id && (
                    <div style={s.cardBody}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Loại vé</span>
                        <button style={s.btn('#00B46E', '#fff')} onClick={() => { setShowAddTicket(ev.id); setEditingTicket(null); setTicketForm({ name: '', price: '', totalQuantity: '' }); }}>+ Thêm</button>
                      </div>

                      {/* Inline Add Ticket Form */}
                      {showAddTicket === ev.id && (
                        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                          <h5 style={{ fontWeight: 600, marginBottom: '0.8rem', fontSize: '0.88rem' }}>Thêm loại vé mới</h5>
                          <form onSubmit={addTicketType}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                              <div><label style={s.label}>Tên vé</label><input style={s.input} required placeholder="VD: Vé thường" value={ticketForm.name} onChange={e => setTicketForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                              <div><label style={s.label}>Giá (VNĐ)</label><input style={s.input} type="number" required min="0" value={ticketForm.price} onChange={e => setTicketForm(prev => ({ ...prev, price: e.target.value }))} /></div>
                              <div><label style={s.label}>Số lượng</label><input style={s.input} type="number" required min="1" value={ticketForm.totalQuantity} onChange={e => setTicketForm(prev => ({ ...prev, totalQuantity: e.target.value }))} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="submit" style={s.btn('#00B46E', '#fff')} disabled={formLoading}>{formLoading ? '...' : 'Thêm'}</button>
                              <button type="button" style={s.btn('#f5f5f5', '#4a5568')} onClick={() => setShowAddTicket(null)}>Hủy</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Inline Edit Ticket Form */}
                      {editingTicket && ev.ticketTypes?.some(t => t.id === editingTicket) && (
                        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                          <h5 style={{ fontWeight: 600, marginBottom: '0.8rem', fontSize: '0.88rem' }}>Sửa loại vé</h5>
                          <form onSubmit={saveEditTicket}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                              <div><label style={s.label}>Tên vé</label><input style={s.input} required value={ticketForm.name} onChange={e => setTicketForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                              <div><label style={s.label}>Giá</label><input style={s.input} type="number" required min="0" value={ticketForm.price} onChange={e => setTicketForm(prev => ({ ...prev, price: e.target.value }))} /></div>
                              <div><label style={s.label}>Số lượng</label><input style={s.input} type="number" required min="1" value={ticketForm.totalQuantity} onChange={e => setTicketForm(prev => ({ ...prev, totalQuantity: e.target.value }))} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="submit" style={s.btn('#00B46E', '#fff')} disabled={formLoading}>{formLoading ? '...' : 'Lưu'}</button>
                              <button type="button" style={s.btn('#f5f5f5', '#4a5568')} onClick={() => { setEditingTicket(null); setTicketForm({ name: '', price: '', totalQuantity: '' }); }}>Hủy</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {(!ev.ticketTypes || ev.ticketTypes.length === 0) ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#a0aec0', fontSize: '0.85rem' }}>Chưa có loại vé</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {ev.ticketTypes.map(tt => (
                            <div key={tt.id} style={s.ticketRow}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{tt.name}</span>
                                <span style={{ margin: '0 12px', color: '#00B46E', fontWeight: 700 }}>{formatMoney(tt.price)}</span>
                                <span style={{ fontSize: '0.82rem', color: '#a0aec0' }}>Còn {tt.availableQuantity}/{tt.totalQuantity}</span>
                              </div>
                              <div style={s.btnGroup}>
                                <button style={s.btn('#f0fdf4', '#00B46E')} onClick={() => openSeatManager(tt)}>Sơ đồ ghế</button>
                                <button style={s.btn('#f5f7fa', '#4a5568')} onClick={() => startEditTicket(tt)}>Sửa</button>
                                <button style={s.btn('#fee2e2', '#ef4444')} onClick={() => deleteTicketType(tt.id)}>Xóa</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {events.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#a0aec0' }}>Chưa có sự kiện. Nhấn "+ Tạo sự kiện"</div>}
            </>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <>
              <div style={s.header}><h1 style={s.headerTitle}>Người dùng ({users.length})</h1></div>

              {editingUser && (
                <div style={s.card}>
                  <div style={s.cardBody}>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Sửa người dùng</h4>
                    <form onSubmit={saveEditUser}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div><label style={s.label}>Họ tên</label><input style={s.input} required value={userForm.fullName} onChange={e => setUserForm(prev => ({ ...prev, fullName: e.target.value }))} /></div>
                        <div><label style={s.label}>Email</label><input style={s.input} type="email" required value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} /></div>
                        <div><label style={s.label}>Mật khẩu mới</label><input style={s.input} type="password" placeholder="Để trống = giữ cũ" value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" style={s.btn('#00B46E', '#fff')} disabled={formLoading}>{formLoading ? '...' : 'Lưu'}</button>
                        <button type="button" style={s.btn('#f5f5f5', '#4a5568')} onClick={() => setEditingUser(null)}>Hủy</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="table-responsive" style={{ ...s.card }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['ID', 'Họ tên', 'Email', 'Role', 'Xác minh', 'Ngày tạo', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={s.td}>{u.id}</td>
                        <td style={{ ...s.td, fontWeight: 600, color: '#1a1a2e' }}>{u.fullName}</td>
                        <td style={s.td}>{u.email}</td>
                        <td style={s.td}>
                          <button onClick={() => toggleRole(u.id, u.role)} style={{ ...s.badge(u.role === 'ROLE_ADMIN' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', u.role === 'ROLE_ADMIN' ? '#ef4444' : '#3b82f6'), cursor: 'pointer', border: 'none' }} title="Click để đổi">
                            {u.role === 'ROLE_ADMIN' ? 'Admin' : 'User'}
                          </button>
                        </td>
                        <td style={s.td}>
                          <button onClick={() => toggleVerify(u.id)} style={{ ...s.badge(u.isVerified ? 'rgba(0,180,110,0.1)' : 'rgba(239,68,68,0.1)', u.isVerified ? '#00B46E' : '#ef4444'), cursor: 'pointer', border: 'none' }} title="Click để đổi">
                            {u.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                          </button>
                        </td>
                        <td style={{ ...s.td, color: '#a0aec0', fontSize: '0.8rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                        <td style={s.td}>
                          <div style={s.btnGroup}>
                            <button style={s.btn('#f5f7fa', '#4a5568')} onClick={() => startEditUser(u)}>Sửa</button>
                            <button style={s.btn('#fee2e2', '#ef4444')} onClick={() => deleteUser(u.id)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ORDERS */}
          {activeTab === 'orders' && (
            <>
              <div style={{ ...s.header, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={s.headerTitle}>Đơn hàng ({orders.length})</h1>
                <button onClick={exportOrdersCSV} style={s.btn('#00B46E', '#fff')}>
                  📥 Xuất CSV
                </button>
              </div>
              <div className="table-responsive" style={{ ...s.card }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['ID', 'Mã giao dịch', 'Khách hàng', 'Tổng tiền', 'Thanh toán', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#a0aec0' }}>Chưa có đơn hàng</td></tr>
                    ) : orders.map(o => (
                      <tr key={o.id}>
                        <td style={s.td}>{o.id}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.78rem' }}>{o.transactionRef}</td>
                        <td style={s.td}><div style={{ fontWeight: 600 }}>{o.userName || '-'}</div><div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{o.userEmail || ''}</div></td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#00B46E' }}>{formatMoney(o.totalAmount)}</td>
                        <td style={s.td}><span style={s.badge('rgba(59,130,246,0.1)', '#3b82f6')}>{o.paymentMethod || '-'}</span></td>
                        <td style={s.td}><span style={s.badge(
                          o.status === 'PAID' ? 'rgba(0,180,110,0.1)' : o.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          o.status === 'PAID' ? '#00B46E' : o.status === 'PENDING' ? '#f59e0b' : '#ef4444'
                        )}>{o.status}</span></td>
                        <td style={{ ...s.td, color: '#a0aec0', fontSize: '0.8rem' }}>{formatDate(o.createdAt)}</td>
                        <td style={s.td}>
                          {o.status === 'PENDING' ? (
                            <div style={s.btnGroup}>
                              <button style={{ ...s.btn('#e8f5e9', '#00B46E'), display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => confirmPayment(o.id)}>{icons.check(14, '#00B46E')} Xác nhận</button>
                              <button style={{ ...s.btn('#fee2e2', '#ef4444'), display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => rejectPayment(o.id)}>{icons.x(14, '#ef4444')} Từ chối</button>
                            </div>
                          ) : (
                            <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {/* ===== STATS TAB ===== */}
          {activeTab === 'stats' && (
            <>
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Thống kê doanh thu</h2>
            {!revenueStats ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}><div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }}></div>Đang tải thống kê...</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  {[{ label: 'Tổng doanh thu', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(revenueStats.totalRevenue || 0), color: '#00B46E' },
                    { label: 'Tổng đơn hàng', value: revenueStats.totalOrders, color: '#3b82f6' },
                    { label: 'Vé đã bán', value: revenueStats.totalTicketsSold, color: '#f59e0b' }].map((s2, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s2.color }}>{s2.value}</div>
                      <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: 4 }}>{s2.label}</div>
                    </div>
                  ))}
                </div>

                {/* 📊 Canvas Bar Chart */}
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📊 Biểu đồ doanh thu theo sự kiện</h3>
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
                  <canvas ref={el => {
                    if (!el || !revenueStats?.eventStats?.length) return;
                    const ctx = el.getContext('2d');
                    const data = revenueStats.eventStats;
                    const W = el.width = el.parentElement.offsetWidth - 32;
                    const H = el.height = Math.max(250, data.length * 45 + 60);
                    const maxRev = Math.max(...data.map(e => Number(e.revenue) || 0), 1);
                    const barH = 28;
                    const gap = 12;
                    const leftPad = 160;
                    const rightPad = 80;
                    const chartW = W - leftPad - rightPad;

                    ctx.clearRect(0, 0, W, H);
                    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);

                    // Grid lines
                    for (let i = 0; i <= 4; i++) {
                      const x = leftPad + (chartW / 4) * i;
                      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
                      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, H - 20); ctx.stroke();
                      ctx.fillStyle = '#a0aec0'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                      ctx.fillText(new Intl.NumberFormat('vi-VN').format(Math.round(maxRev / 4 * i)) + 'đ', x, H - 5);
                    }

                    data.forEach((ev, i) => {
                      const y = 30 + i * (barH + gap);
                      const barW = (Number(ev.revenue) || 0) / maxRev * chartW;

                      // Label
                      ctx.fillStyle = '#374151'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
                      const title = ev.title.length > 18 ? ev.title.slice(0, 18) + '…' : ev.title;
                      ctx.fillText(title, leftPad - 10, y + barH / 2 + 4);

                      // Bar gradient
                      const grad = ctx.createLinearGradient(leftPad, 0, leftPad + barW, 0);
                      grad.addColorStop(0, '#00B46E'); grad.addColorStop(1, '#38a169');
                      ctx.fillStyle = grad;
                      ctx.beginPath(); ctx.roundRect(leftPad, y, Math.max(barW, 2), barH, 6); ctx.fill();

                      // Value
                      ctx.fillStyle = '#374151'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
                      ctx.fillText(new Intl.NumberFormat('vi-VN').format(ev.revenue || 0) + 'đ', leftPad + barW + 8, y + barH / 2 + 4);
                    });
                  }} style={{ width: '100%', borderRadius: 8 }} />
                </div>

                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Chi tiết theo sự kiện</h3>
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem' }}>
                  {(revenueStats.eventStats || []).map((es, i) => {
                    const maxRev = Math.max(...(revenueStats.eventStats || []).map(e => Number(e.revenue) || 0), 1);
                    const pct = ((Number(es.revenue) || 0) / maxRev * 100);
                    return (
                      <div key={i} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{es.title}</span>
                          <span style={{ color: '#718096' }}>{new Intl.NumberFormat('vi-VN').format(es.revenue || 0)}đ · {es.ticketsSold} vé</span>
                        </div>
                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #00B46E, #38a169)', borderRadius: 4, transition: 'width 0.5s' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            </>
          )}

          {/* ===== VOUCHER TAB ===== */}
          {activeTab === 'vouchers' && (
            <>
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Quản lý Voucher</h2>
            <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Tạo mã giảm giá</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input placeholder="Mã voucher (VD: GIAM20)" value={voucherForm.code} onChange={e => setVoucherForm({...voucherForm, code: e.target.value})} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                <input placeholder="Mô tả" value={voucherForm.description} onChange={e => setVoucherForm({...voucherForm, description: e.target.value})} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                <input type="number" placeholder="Giảm % (VD: 10)" value={voucherForm.discountPercent} onChange={e => setVoucherForm({...voucherForm, discountPercent: e.target.value})} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                <input type="number" placeholder="Giảm cố định (đồng)" value={voucherForm.discountAmount} onChange={e => setVoucherForm({...voucherForm, discountAmount: e.target.value})} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                <input type="number" placeholder="Số lượt dùng tối đa" value={voucherForm.maxUses} onChange={e => setVoucherForm({...voucherForm, maxUses: e.target.value})} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
                <input type="datetime-local" placeholder="Hết hạn" value={voucherForm.expiryDate} onChange={e => setVoucherForm({...voucherForm, expiryDate: e.target.value})} style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #ddd' }} />
              </div>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={async () => {
                const body = {
                  code: voucherForm.code,
                  description: voucherForm.description,
                  discountPercent: voucherForm.discountPercent ? parseInt(voucherForm.discountPercent) : null,
                  discountAmount: voucherForm.discountAmount ? parseInt(voucherForm.discountAmount) : null,
                  maxUses: voucherForm.maxUses ? parseInt(voucherForm.maxUses) : null,
                  expiryDate: voucherForm.expiryDate || null,
                };
                const res = await apiRequest('/vouchers/admin', { method: 'POST', body: JSON.stringify(body) });
                if (res.success) {
                  setVoucherForm({ code: '', description: '', discountPercent: '', discountAmount: '', maxUses: '', expiryDate: '' });
                  const r2 = await apiRequest('/vouchers/admin');
                  if (r2.success) setVouchers(r2.data);
                } else alert(res.message);
              }}>Tạo Voucher</button>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 600 }}>Danh sách voucher</h4>
                <button className="btn btn-outline btn-sm" onClick={async () => {
                  const res = await apiRequest('/vouchers/admin');
                  if (res.success) setVouchers(res.data);
                }}>Làm mới</button>
              </div>
              {vouchers.length === 0 ? (
                <p style={{ color: '#a0aec0', textAlign: 'center', padding: '1rem' }}>Chưa có voucher. Bấm "Làm mới" để tải.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', padding: '0.6rem' }}>Mã</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem' }}>Mô tả</th>
                        <th style={{ textAlign: 'center', padding: '0.6rem' }}>Giảm</th>
                        <th style={{ textAlign: 'center', padding: '0.6rem' }}>Sử dụng</th>
                        <th style={{ textAlign: 'center', padding: '0.6rem' }}>Trạng thái</th>
                        <th style={{ textAlign: 'center', padding: '0.6rem' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--primary)' }}>{v.code}</td>
                          <td style={{ padding: '0.6rem' }}>{v.description || '-'}</td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            {v.discountPercent ? `${v.discountPercent}%` : v.discountAmount ? `${new Intl.NumberFormat('vi-VN').format(v.discountAmount)}đ` : '-'}
                          </td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>{v.currentUses}/{v.maxUses || '∞'}</td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: v.isActive ? '#e8f5e9' : '#fbe9e7', color: v.isActive ? '#2e7d32' : '#c62828' }}>
                              {v.isActive ? 'Hoạt động' : 'Tắt'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                            <button onClick={async () => {
                              await apiRequest(`/vouchers/admin/${v.id}`, { method: 'DELETE' });
                              setVouchers(prev => prev.filter(x => x.id !== v.id));
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </>
          )}
        </main>

      </div>

      {/* ===== SEAT MANAGER MODAL ===== */}
      {seatManagerTicket && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998
        }} onClick={(e) => { if (e.target === e.currentTarget) setSeatManagerTicket(null); }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '2rem', maxWidth: 500, width: '92%',
            boxShadow: '0 25px 80px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a1a2e', marginBottom: 4 }}>Sơ đồ ghế ngồi</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Loại vé: <strong>{seatManagerTicket.name}</strong></p>
              </div>
              <button onClick={() => setSeatManagerTicket(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>x</button>
            </div>

            <div style={{ background: seatManagerTicket.seatCount > 0 ? '#f0fdf4' : '#fef9c3', border: `1px solid ${seatManagerTicket.seatCount > 0 ? '#bbf7d0' : '#fde68a'}`, borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '2rem' }}>{seatManagerTicket.seatCount > 0 ? '✅' : '⚠️'}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>
                  {seatManagerTicket.seatCount > 0 ? `Đang có ${seatManagerTicket.seatCount} ghế` : 'Chưa có sơ đồ ghế nào'}
                </p>
                <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                  {seatManagerTicket.seatCount > 0 ? 'Tạo mới sẽ xóa toàn bộ ghế cũ và không thể hoàn tác.' : 'Thiết lập sơ đồ ghế để người dùng có thể chọn vị trí.'}
                </p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#374151', marginBottom: '1rem' }}>Cấu hình sơ đồ</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={s.label}>Số hàng (A, B, C...)</label>
                  <input type="number" min="1" max="26"
                    style={{ ...s.input, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}
                    value={seatConfig.rows}
                    onChange={e => setSeatConfig(prev => ({ ...prev, rows: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={s.label}>Số cột (01, 02...)</label>
                  <input type="number" min="1" max="50"
                    style={{ ...s.input, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}
                    value={seatConfig.cols}
                    onChange={e => setSeatConfig(prev => ({ ...prev, cols: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e0f2fe', borderRadius: 8, fontSize: '0.85rem', color: '#0369a1', textAlign: 'center', fontWeight: 600 }}>
                Tổng: {Number(seatConfig.rows) * Number(seatConfig.cols)} ghế
                &nbsp;&bull;&nbsp;
                Hàng {String.fromCharCode(65)} → {String.fromCharCode(65 + Number(seatConfig.rows) - 1)}
                &nbsp;&bull;&nbsp;Cột 01 → {String(seatConfig.cols).padStart(2, '0')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={generateSeats}
                disabled={seatLoading}
                style={{ ...s.btn('#00B46E', '#fff'), flex: 1, padding: '0.8rem', fontSize: '0.92rem', fontWeight: 700, borderRadius: 10 }}
              >
                {seatLoading ? 'Đang tạo...' : seatManagerTicket.seatCount > 0 ? '🔄 Tạo lại (Reset)' : '✨ Tạo sơ đồ ghế'}
              </button>
              <button onClick={() => setSeatManagerTicket(null)}
                style={{ ...s.btn('#f1f5f9', '#475569'), padding: '0.8rem 1.2rem', borderRadius: 10 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmDialog.show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 440, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>{confirmDialog.title}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
                style={{
                  padding: '0.6rem 1.25rem', borderRadius: 10, border: '1px solid #e2e8f0',
                  background: '#f8fafc', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
                }}>Hủy</button>
              <button onClick={confirmDialog.onConfirm}
                style={{
                  padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none',
                  background: 'var(--primary, #00B46E)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
