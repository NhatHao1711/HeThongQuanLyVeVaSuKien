'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { API_BASE, apiRequest, isLoggedIn, getUser } from '@/lib/api';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [operationsStats, setOperationsStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeFilter, setTimeFilter] = useState('28days'); // '7days' | '28days' | 'thismonth'
  const [showFullReport, setShowFullReport] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [agencySearch, setAgencySearch] = useState('');

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAddTicket, setShowAddTicket] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [seatManagerTicket, setSeatManagerTicket] = useState(null);
  const [seatConfig, setSeatConfig] = useState({ rows: 10, cols: 10 });
  const [seatLoading, setSeatLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);

  const [eventForm, setEventForm] = useState({ title: '', description: '', location: '', startTime: '', endTime: '', surveyUrl: '', categoryId: '' });
  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ticketForm, setTicketForm] = useState({ name: '', price: '', totalQuantity: '' });
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });

  const [agencyTab, setAgencyTab] = useState('pending');
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [voucherForm, setVoucherForm] = useState({ code: '', description: '', discountPercent: '', discountAmount: '', maxUses: '', expiryDate: '' });

  const [rejectEventId, setRejectEventId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [eventTab, setEventTab] = useState('all');

  useEffect(() => {
    const user = getUser();
    if (!isLoggedIn() || user?.role !== 'ROLE_ADMIN') { router.push('/login'); return; }
    loadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'vouchers' && vouchers.length === 0) {
      apiRequest('/vouchers/admin').then(res => { if (res.success) setVouchers(res.data); });
    }
    if (activeTab === 'agencies') {
      loadAgencies();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'agencies') {
      loadAgencies();
    }
  }, [agencyTab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, op, u, e, o, c] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/stats/operations'),
        apiRequest('/admin/users'),
        apiRequest('/admin/events'),
        apiRequest('/admin/orders'),
        apiRequest('/categories'),
      ]);
      if (s.success) setStats(s.data);
      if (op.success) setOperationsStats(op.data);
      if (u.success) setUsers(u.data);
      if (e.success) setEvents(e.data);
      if (o.success) setOrders(o.data);
      if (c.success) setCategories(c.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAgencies = async (tab = agencyTab) => {
    setAgenciesLoading(true);
    try {
      const url = tab === 'pending' ? '/admin/organizers/requests' : '/admin/organizers/requests/approved';
      const res = await apiRequest(url);
      if (res.success) {
        setAgencies(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAgenciesLoading(false);
    }
  };

  const handleApproveAgency = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn duyệt yêu cầu đăng ký đại lý này?')) return;
    try {
      const res = await apiRequest(`/admin/organizers/requests/${id}/approve`, { method: 'POST' });
      if (res.success) {
        showMsg('success', 'Đã duyệt yêu cầu làm đại lý thành công!');
        loadAgencies();
      } else {
        showMsg('error', res.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const handleRejectAgency = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn từ chối yêu cầu đăng ký đại lý này?')) return;
    try {
      const res = await apiRequest(`/admin/organizers/requests/${id}/reject`, { method: 'POST' });
      if (res.success) {
        showMsg('success', 'Đã từ chối yêu cầu đăng ký đại lý.');
        loadAgencies();
      } else {
        showMsg('error', res.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const handleBlockAgency = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn khóa đại lý này?')) return;
    try {
      const res = await apiRequest(`/admin/organizers/requests/${id}/block`, { method: 'POST' });
      if (res.success) {
        showMsg('success', 'Đã khóa đại lý thành công!');
        loadAgencies();
      } else {
        showMsg('error', res.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const handleUnblockAgency = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn mở khóa đại lý này?')) return;
    try {
      const res = await apiRequest(`/admin/organizers/requests/${id}/unblock`, { method: 'POST' });
      if (res.success) {
        showMsg('success', 'Đã mở khóa đại lý thành công!');
        loadAgencies();
      } else {
        showMsg('error', res.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const confirmPayment = async (orderId) => {
    setConfirmDialog({
      show: true,
      title: 'Xác nhận thanh toán',
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
      title: 'Từ chối thanh toán',
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
      const res = await fetch(`${API_BASE}/events/admin/${eventId}/upload-image`, {
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
  const getStatusBadge = (status) => {
    const normalized = String(status || 'UNKNOWN').toUpperCase();
    const config = {
      PAID: ['Đã thanh toán', styles.badgeSuccess],
      SUCCESS: ['Thành công', styles.badgeSuccess],
      COMPLETED: ['Hoàn tất', styles.badgeSuccess],
      PENDING: ['Đang chờ', styles.badgeWarning],
      PROCESSING: ['Đang xử lý', styles.badgeBlue],
      FAILED: ['Thất bại', styles.badgeDanger],
      CANCELLED: ['Đã hủy', styles.badgeGray],
      REFUNDED: ['Hoàn tiền', styles.badgeBlue],
      UNKNOWN: ['Không rõ', styles.badgeGray],
    };
    const [label, className] = config[normalized] || [normalized, styles.badgeGray];
    return <span className={`${styles.badge} ${className}`}>{label}</span>;
  };

  const exportOrdersCSV = () => {
    if (!orders || orders.length === 0) {
      alert('Không có dữ liệu để xuất');
      return;
    }
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
        if (selectedImage && res.data?.id) {
          await uploadEventImage(res.data.id, selectedImage);
        }
        showMsg('success', 'Tạo sự kiện thành công!');
        setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '', surveyUrl: '', categoryId: '' });
        clearImageSelection();
        setShowCreateEvent(false);
        await loadAll();
      }
      else showMsg('error', res.message || 'Lỗi');
    } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
  };

  const startEditEvent = (ev) => {
    setEditingEvent(ev.id);
    setEventForm({ title: ev.title || '', description: ev.description || '', location: ev.location || '', startTime: ev.startTime ? ev.startTime.substring(0, 16) : '', endTime: ev.endTime ? ev.endTime.substring(0, 16) : '', surveyUrl: ev.surveyUrl || '', categoryId: ev.category?.id || '' });
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
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await apiRequest('/categories/admin/create', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      if (res.success) {
        setCategories(prev => [...prev, res.data]);
        setEventForm(prev => ({ ...prev, categoryId: res.data.id }));
        setNewCategoryName('');
        setShowNewCategoryInput(false);
        showMsg('success', 'Đã tạo phân loại mới thành công!');
      } else {
        showMsg('error', res.message || 'Lỗi khi tạo phân loại');
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const publishEvent = async (id) => { await apiRequest(`/events/admin/${id}/publish`, { method: 'POST' }); await loadAll(); showMsg('success', 'Đã xuất bản!'); };
  const closeEvent = async (id) => { await apiRequest(`/events/admin/${id}/close`, { method: 'POST' }); await loadAll(); showMsg('success', 'Đã đóng!'); };
  const deleteEvent = (id) => {
    setConfirmDialog({
      show: true,
      title: 'Xóa sự kiện',
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

  const handleApproveEvent = async (id) => {
    if (!confirm('Duyệt sự kiện này để cho phép bán vé?')) return;
    try {
      const res = await apiRequest(`/admin/events/${id}/approve`, { method: 'POST' });
      if (res.success) {
        showMsg('success', 'Đã duyệt và xuất bản sự kiện thành công!');
        await loadAll();
      } else {
        showMsg('error', res.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const handleRejectEvent = (id) => {
    setRejectEventId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const submitRejectEvent = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      const res = await apiRequest(`/admin/events/${rejectEventId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectReason })
      });
      if (res.success) {
        showMsg('success', 'Đã từ chối duyệt sự kiện');
        setShowRejectModal(false);
        await loadAll();
      } else {
        showMsg('error', res.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const handleUpdateFeatured = async (id, tag) => {
    try {
      const res = await apiRequest(`/admin/events/${id}/featured`, {
        method: 'POST',
        body: JSON.stringify({
          featuredTag: tag || null,
          isFeatured: !!tag
        })
      });
      if (res.success) {
        showMsg('success', 'Đã cập nhật nhãn ưu tiên');
        await loadAll();
      } else {
        showMsg('error', res.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối');
    }
  };

  const sendMarketingEmail = (id) => {
    setConfirmDialog({
      show: true,
      title: 'Gửi email quảng bá',
      message: 'Gửi email quảng bá sự kiện này đến TẤT CẢ người dùng? Email sẽ được gửi ngay lập tức.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setFormLoading(true);
        try {
          const res = await apiRequest(`/events/admin/${id}/marketing`, { method: 'POST' });
          if (res.success) showMsg('success', 'Đã gửi email quảng bá!');
          else showMsg('error', res.message);
        } catch { showMsg('error', 'Lỗi kết nối'); } finally { setFormLoading(false); }
      }
    });
  };

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
      title: 'Xóa loại vé',
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
      title: 'Xóa người dùng',
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

  const systemTabs = [
    { id: 'dashboard', label: 'Tổng quan' },
    { id: 'revenue', label: 'Doanh thu & Báo cáo' },
    { id: 'users', label: 'Người dùng' },
    { id: 'orders', label: 'Đơn hàng' },
    { id: 'vouchers', label: 'Mã giảm giá' },
  ];

  const agencyTabs = [
    { id: 'agencies', label: 'Phê duyệt đại lý' },
    { id: 'events', label: 'Phê duyệt sự kiện' },
  ];

  if (loading) return (<><Navbar /><div style={{ display: 'flex', minHeight: '100vh', paddingTop: 64, alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}><div className="spinner" style={{ width: 40, height: 40 }}></div></div></>);

  const renderEventForm = (onSubmit, isEdit) => (
    <div className={styles.card} style={{ maxWidth: '780px', margin: '0 auto 2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)', border: '1px solid var(--admin-border)' }}>
      <div className={styles.cardHeader} style={{ background: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid var(--admin-border)' }}>
        <h4 className={styles.cardTitle} style={{ fontSize: '1.25rem', fontWeight: 800 }}>{isEdit ? 'Chỉnh sửa thông tin sự kiện' : 'Tạo sự kiện mới'}</h4>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--admin-text-sub)' }}>Điền thông tin chi tiết để hiển thị sự kiện trên hệ thống bán vé</p>
      </div>
      <div className={styles.cardBody} style={{ padding: '2rem' }}>
        <form onSubmit={onSubmit}>
          {/* Section 1: Basic Info */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--admin-primary)' }}></span>
              Thông tin cơ bản
            </div>
            
            <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
              <label className={styles.label}>Tên sự kiện</label>
              <input className={styles.input} required placeholder="VD: Lễ Hội Âm Nhạc Chào Hè 2026..." value={eventForm.title} onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className={styles.label} style={{ marginBottom: 0 }}>Phân loại sự kiện (Không bắt buộc)</label>
                <button type="button" onClick={() => setShowNewCategoryInput(!showNewCategoryInput)} className={styles.btn} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--admin-primary)', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'underline' }}>
                  {showNewCategoryInput ? 'Đóng nhập mới' : '+ Tạo phân loại mới'}
                </button>
              </div>
              {!showNewCategoryInput ? (
                <select className={styles.input} style={{ background: '#fff', cursor: 'pointer' }} value={eventForm.categoryId} onChange={e => setEventForm(prev => ({ ...prev, categoryId: e.target.value }))}>
                  <option value="">-- Chọn phân loại sự kiện --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className={styles.input} style={{ flex: 1 }} placeholder="Tên phân loại mới (VD: Hội thao)..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                  <button type="button" onClick={handleAddNewCategory} className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0 1.25rem' }}>Lưu</button>
                  <button type="button" onClick={() => { setShowNewCategoryInput(false); setNewCategoryName(''); }} className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: '0 1.25rem' }}>Hủy</button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Mô tả chi tiết</label>
              <textarea className={styles.input} style={{ resize: 'vertical', minHeight: '110px', lineHeight: '1.5' }} required rows={4} placeholder="Cung cấp thông tin chi tiết về nội dung sự kiện, lịch trình, đối tượng tham gia..." value={eventForm.description} onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>

          {/* Section 2: Time & Location */}
          <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--admin-primary)' }}></span>
              Thời gian & Địa điểm
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
              <label className={styles.label}>Địa điểm tổ chức</label>
              <input className={styles.input} required placeholder="VD: Hội trường A5, Nhà thi đấu..." value={eventForm.location} onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))} />
            </div>

            <div className={styles.editFormGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Thời gian bắt đầu</label>
                <input className={styles.input} type="datetime-local" required value={eventForm.startTime} onChange={e => setEventForm(prev => ({ ...prev, startTime: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Thời gian kết thúc</label>
                <input className={styles.input} type="datetime-local" required value={eventForm.endTime} onChange={e => setEventForm(prev => ({ ...prev, endTime: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Section 3: Media & Survey */}
          <div style={{ marginBottom: '2.5rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--admin-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--admin-primary)' }}></span>
              Hình ảnh & Khảo sát
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '1.25rem' }}>
              <label className={styles.label}>Đường dẫn khảo sát ý kiến (Google Forms)</label>
              <input className={styles.input} type="url" placeholder="https://docs.google.com/forms/d/..." value={eventForm.surveyUrl} onChange={e => setEventForm(prev => ({ ...prev, surveyUrl: e.target.value }))} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Hình ảnh Banner sự kiện</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', border: '1px dashed var(--admin-border)', borderRadius: '12px' }}>
                <label className={styles.btn} style={{ background: '#fff', border: '1px solid var(--admin-border)', color: '#0f172a', cursor: 'pointer', padding: '0.75rem 1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  {imagePreview ? 'Thay đổi ảnh' : 'Chọn tập tin hình ảnh'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                </label>
                
                {imagePreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '120px', height: '75px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--admin-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                    <button type="button" onClick={clearImageSelection} className={styles.btn} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--admin-danger)', border: 'none', padding: '6px 12px' }}>Gỡ ảnh</button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-sub)' }}>Chấp nhận định dạng JPG, PNG kích thước tối đa 5MB</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.btnGroup} style={{ justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem' }}>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px' }} onClick={() => { setShowCreateEvent(false); setEditingEvent(null); clearImageSelection(); }}>Hủy bỏ</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.75rem 2rem', borderRadius: '10px' }} disabled={formLoading}>{formLoading ? 'Đang xử lý...' : (isEdit ? 'Lưu thay đổi' : 'Tạo sự kiện')}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderDailySalesChart = () => {
    if (!stats) return null;

    const salesData = Array.isArray(stats.salesByDate) ? stats.salesByDate : [];
    const revenueData = salesData
      .map((item) => ({
        name: item.date || 'Chưa rõ ngày',
        value: Number(item.revenue || 0)
      }))
      .filter((item) => item.value > 0);
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);

    const categoryData = Object.entries(stats.categoryTicketSales || {})
      .map(([name, value]) => ({ name, value: Number(value || 0) }))
      .filter((item) => item.value > 0);
    const totalCategoryTickets = categoryData.reduce((sum, item) => sum + item.value, 0);

    const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
    const circumference = 314.159;

    const buildSegments = (items, total) => {
      let offset = 0;
      return items.map((item, index) => {
        const length = total > 0 ? (item.value / total) * circumference : 0;
        const segment = {
          ...item,
          color: colors[index % colors.length],
          length,
          offset,
          percent: total > 0 ? Math.round((item.value / total) * 100) : 0
        };
        offset += length;
        return segment;
      });
    };

    const formatChartDate = (value) => {
      if (!value || value === 'Chưa rõ ngày') return 'Chưa rõ ngày';
      if (String(value).includes('-')) {
        const [year, month, day] = String(value).split('-');
        return day && month ? day + '/' + month : value;
      }
      return value;
    };

    const renderDonut = ({ title, subtitle, segments, total, centerValue, centerLabel, emptyText, valueFormatter }) => (
      <div className={styles.chartCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>{title}</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.88rem' }}>{subtitle}</p>
          </div>
          <span style={{ background: total > 0 ? '#ecfdf5' : '#f1f5f9', color: total > 0 ? '#047857' : '#64748b', padding: '7px 11px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800 }}>
            {total > 0 ? 'Có dữ liệu' : 'Chưa có dữ liệu'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', alignItems: 'center', gap: '22px' }}>
          <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto' }}>
            <svg width="220" height="220" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#eef2f7" strokeWidth="13" />
              {segments.map((segment) => (
                <circle
                  key={segment.name}
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={segment.length + ' ' + (circumference - segment.length)}
                  strokeDashoffset={-segment.offset}
                />
              ))}
            </svg>
            <div style={{ position: 'absolute', inset: '44px', borderRadius: '50%', background: '#fff', display: 'grid', placeContent: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #eef2f7' }}>
              <strong style={{ color: '#0f172a', fontSize: centerValue.length > 10 ? '1.1rem' : '1.35rem' }}>{centerValue}</strong>
              <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{centerLabel}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {segments.length === 0 ? (
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '18px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>{emptyText}</div>
            ) : segments.map((segment) => (
              <div key={segment.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: segment.color, flex: '0 0 auto' }} />
                  <span style={{ color: '#334155', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatChartDate(segment.name)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#0f172a' }}>{valueFormatter(segment.value)}</strong>
                  <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>{segment.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.15fr) minmax(320px, 0.85fr)', gap: '24px', marginBottom: '32px' }}>
        {renderDonut({
          title: 'Biểu đồ tròn doanh thu',
          subtitle: 'Cơ cấu doanh thu theo từng ngày có giao dịch thanh toán',
          segments: buildSegments(revenueData, totalRevenue),
          total: totalRevenue,
          centerValue: formatMoney(totalRevenue),
          centerLabel: 'Doanh thu',
          emptyText: 'Chưa có doanh thu thực tế để hiển thị biểu đồ.',
          valueFormatter: formatMoney
        })}
        {renderDonut({
          title: 'Cơ cấu vé theo danh mục',
          subtitle: 'Tỷ trọng vé đã bán theo từng nhóm sự kiện',
          segments: buildSegments(categoryData, totalCategoryTickets),
          total: totalCategoryTickets,
          centerValue: String(totalCategoryTickets),
          centerLabel: 'Tổng vé',
          emptyText: 'Chưa có dữ liệu danh mục từ vé đã bán.',
          valueFormatter: (value) => value + ' vé'
        })}
      </div>
    );
  };

  const handleExportReport = () => {
    if (!stats) return;
    const csvContent = [
      ["Tieu chi", "Gia tri"],
      ["Tong so nguoi dung", stats.totalUsers],
      ["Tong so su kien", stats.totalEvents],
      ["Tong so don hang", stats.totalOrders],
      ["Tong so ve ban ra", stats.totalTicketsSold],
      ["Tong doanh thu (VND)", stats.totalRevenue],
      ["Su kien dang ban ve", stats.publishedEvents || 0],
      ["Su kien cho duyet", stats.pendingEvents || 0]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_Trivent_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Navbar />
      <div className={styles.pageContainer}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarMenu}>
            <div className={styles.sidebarTitle}>Hệ thống</div>
            {systemTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`${styles.sidebarItem} ${activeTab === t.id ? styles.sidebarItemActive : ''}`}>
                {t.label}
              </button>
            ))}
            
            <div className={styles.sidebarTitle}>Đối tác đại lý</div>
            {agencyTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`${styles.sidebarItem} ${activeTab === t.id ? styles.sidebarItemActive : ''}`}>
                {t.label}
              </button>
            ))}

            <div style={{ padding: '1rem' }}>
              <Link href="/admin/checkin" style={{ display: 'block', padding: '0.75rem 1rem', fontSize: '0.88rem', fontWeight: 700, color: '#fff', background: 'var(--admin-primary)', borderRadius: 10, textDecoration: 'none', textAlign: 'center' }}>
                Quét QR Check-in
              </Link>
            </div>
          </div>
          
          <div className={styles.sidebarFooter}>
            <Link href="/" className={styles.backLink}>Quay lại trang chủ</Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {formMsg.text && (
            <div className={`${styles.alert} ${formMsg.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
              {formMsg.text}
            </div>
          )}

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h1 className={styles.title}>Tổng quan</h1>
                  <p className={styles.description}>Báo cáo số liệu và hoạt động của hệ thống TRIVENT</p>
                </div>
              </div>
              {stats && (
                <>
                  {/* SaaS Premium Control Filter Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                        <span>Dữ liệu Trivent Hệ thống</span>
                      </div>

                      <select 
                        value={timeFilter} 
                        onChange={(e) => setTimeFilter(e.target.value)} 
                        style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="7days">7 ngày qua</option>
                        <option value="28days">28 ngày qua</option>
                        <option value="thismonth">Tháng này</option>
                      </select>

                      <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>100% Khách hàng</span>
                      </div>

                      <button style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ＋ Thêm bộ lọc
                      </button>
                    </div>

                    <button 
                      onClick={handleExportReport}
                      style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)' }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Xuất báo cáo
                    </button>
                  </div>

                  <div className={styles.statsGrid}>
                  <div className={`${styles.statCard} ${styles.statCardBlue}`}>
                    <div className={styles.statLabel}>Người dùng</div>
                    <div className={styles.statValue}>{stats.totalUsers}</div>
                  </div>
                  <div className={`${styles.statCard} ${styles.statCardPurple}`}>
                    <div className={styles.statLabel}>Doanh thu</div>
                    <div className={styles.statValue} style={{ fontSize: '1.65rem', paddingTop: '0.45rem' }}>{formatMoney(stats.totalRevenue)}</div>
                  </div>
                  <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                    <div className={styles.statLabel}>Sự kiện</div>
                    <div className={styles.statValue}>{stats.totalEvents}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-sub)', marginTop: '4px' }}>
                      Đang mở: <strong style={{ color: 'var(--admin-success)' }}>{stats.publishedEvents || 0}</strong> · Chờ duyệt: <strong style={{ color: 'var(--admin-warning)' }}>{stats.pendingEvents || 0}</strong>
                    </div>
                  </div>
                  <div className={`${styles.statCard} ${styles.statCardYellow}`}>
                    <div className={styles.statLabel}>Đơn hàng</div>
                    <div className={styles.statValue}>{stats.totalOrders}</div>
                  </div>
                  <div className={`${styles.statCard} ${styles.statCardOrange}`}>
                    <div className={styles.statLabel}>Đại lý chờ duyệt</div>
                    <div className={styles.statValue}>{stats.pendingOrganizers || 0}</div>
                  </div>
                </div>

              </>
            )}

              {renderDailySalesChart()}

              {/* Attendance Tracking Operations Stats */}
              {operationsStats && operationsStats.eventStats && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Theo dõi chuyên cần & Check-in sự kiện thực tế</h3>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.tableResponsive}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.th}>Tên sự kiện</th>
                            <th className={styles.th} style={{ textAlign: 'center' }}>Vé đã bán</th>
                            <th className={styles.th} style={{ textAlign: 'center' }}>Đã check-in</th>
                            <th className={styles.th}>Tỷ lệ tham dự thực tế</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operationsStats.eventStats.length === 0 ? (
                            <tr>
                              <td colSpan={4} className={styles.td} style={{ textAlign: 'center', color: 'var(--admin-text-sub)' }}>Không có hoạt động sự kiện nào</td>
                            </tr>
                          ) : (
                            operationsStats.eventStats.map((e, idx) => (
                              <tr key={idx} className={styles.tableRow}>
                                <td className={styles.td} style={{ fontWeight: 600 }}>{e.title}</td>
                                <td className={styles.td} style={{ textAlign: 'center', fontWeight: 600 }}>{e.ticketsSold}</td>
                                <td className={styles.td} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--admin-primary)' }}>{e.checkedIn}</td>
                                <td className={styles.td}>
                                  <div className={styles.progressLabelGroup}>
                                    <span>Tỉ lệ:</span>
                                    <span className={styles.progressValue}>{Number(e.attendanceRate).toFixed(1)}%</span>
                                  </div>
                                  <div className={styles.progressTrack}>
                                    <div className={styles.progressBar} style={{ width: `${Math.min(e.attendanceRate, 100)}%` }}></div>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* REVENUE REPORT */}
          {activeTab === 'revenue' && (
            <>
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h1 className={styles.title}>Doanh thu & Báo cáo</h1>
                  <p className={styles.description}>Theo dõi doanh thu bán vé, đơn hàng và hiệu suất vận hành toàn hệ thống.</p>
                </div>
                <button onClick={handleExportReport} className={`${styles.btn} ${styles.btnPrimary}`}>
                  Xuất báo cáo CSV
                </button>
              </div>

              {stats && (
                <>
                  <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.statCardPurple}`}>
                      <div className={styles.statLabel}>Tổng doanh thu</div>
                      <div className={styles.statValue} style={{ fontSize: '1.65rem', paddingTop: '0.45rem' }}>{formatMoney(stats.totalRevenue)}</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statCardYellow}`}>
                      <div className={styles.statLabel}>Tổng đơn hàng</div>
                      <div className={styles.statValue}>{stats.totalOrders}</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statCardGreen}`}>
                      <div className={styles.statLabel}>Vé đã bán</div>
                      <div className={styles.statValue}>{stats.totalTicketsSold || 0}</div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statCardBlue}`}>
                      <div className={styles.statLabel}>Sự kiện đang bán</div>
                      <div className={styles.statValue}>{stats.publishedEvents || 0}</div>
                    </div>
                  </div>

                  {renderDailySalesChart()}

                  <div className={styles.card} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}>Đơn hàng gần đây</h3>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.tableResponsive}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th className={styles.th}>Mã đơn</th>
                              <th className={styles.th}>Khách hàng</th>
                              <th className={styles.th}>Trạng thái</th>
                              <th className={styles.th} style={{ textAlign: 'right' }}>Giá trị</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.slice(0, 8).map(order => (
                              <tr key={order.id} className={styles.tableRow}>
                                <td className={styles.td} style={{ fontWeight: 700 }}>#{order.id}</td>
                                <td className={styles.td}>{order.userName || order.userEmail || 'Khách hàng'}</td>
                                <td className={styles.td}>{getStatusBadge(order.paymentStatus)}</td>
                                <td className={styles.td} style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(order.totalAmount || 0)}</td>
                              </tr>
                            ))}
                            {orders.length === 0 && (
                              <tr>
                                <td colSpan={4} className={styles.td} style={{ textAlign: 'center', color: 'var(--admin-text-sub)' }}>Chưa có đơn hàng</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* EVENTS */}
          {activeTab === 'events' && (
            <>
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h1 className={styles.title}>Quản lý sự kiện</h1>
                  <p className={styles.description}>Tổng số sự kiện trên hệ thống: {events.length}</p>
                </div>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setShowCreateEvent(!showCreateEvent); setEditingEvent(null); setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '', surveyUrl: '', categoryId: '' }); }}>
                  {showCreateEvent ? 'Đóng form' : '+ Tạo sự kiện mới'}
                </button>
              </div>

              {/* Sub tabs for Events */}
              <div className={styles.subTabs}>
                <button onClick={() => setEventTab('all')} className={`${styles.subTabBtn} ${eventTab === 'all' ? styles.subTabBtnActive : ''}`}>
                  Tất cả sự kiện ({events.length})
                </button>
                <button onClick={() => setEventTab('pending')} className={`${styles.subTabBtn} ${eventTab === 'pending' ? styles.subTabBtnActive : ''}`}>
                  Đang chờ duyệt ({events.filter(e => e.status === 'PENDING').length})
                </button>
              </div>

              {/* Toolbar search */}
              <div className={styles.toolbar}>
                <input className={styles.searchInput} placeholder="Tìm kiếm sự kiện theo tên hoặc địa điểm..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} />
                <select className={styles.filterSelect} value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
                  <option value="DRAFT">Bản nháp (DRAFT)</option>
                  <option value="PENDING">Chờ duyệt (PENDING)</option>
                  <option value="REJECTED">Từ chối (REJECTED)</option>
                  <option value="CLOSED">Đã đóng (CLOSED)</option>
                </select>
              </div>

              {showCreateEvent && renderEventForm(createEvent, false)}
              {editingEvent && !showCreateEvent && renderEventForm(saveEditEvent, true)}

              {events
                .filter(ev => {
                  if (eventTab === 'pending') return ev.status === 'PENDING';
                  return true;
                })
                .filter(ev => {
                  if (eventFilter !== 'ALL' && ev.status !== eventFilter) return false;
                  const query = eventSearch.toLowerCase();
                  return ev.title?.toLowerCase().includes(query) || ev.location?.toLowerCase().includes(query);
                })
                .map(ev => (
                  <div key={ev.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, flexWrap: 'wrap' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--admin-border)' }}>
                          {ev.imageUrl ? (
                            <img src={`http://localhost:8080${ev.imageUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--admin-text-sub)' }}>TRIVENT</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{ev.title}</span>
                            <span className={`${styles.badge} ${
                              ev.status === 'PUBLISHED' ? styles.badgeSuccess : 
                              ev.status === 'PENDING' ? styles.badgeWarning : 
                              ev.status === 'REJECTED' || ev.status === 'CLOSED' ? styles.badgeDanger : 
                              styles.badgeBlue
                            }`}>{ev.status}</span>
                            {ev.featuredTag && (
                              <span className={`${styles.badge} ${styles.badgeGray}`}>{ev.featuredTag}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-sub)' }}>
                            Phân loại: {ev.category?.name || 'Chưa phân loại'}  ·  Địa điểm: {ev.location}  ·  Thời gian: {formatDate(ev.startTime)}
                          </div>
                          {ev.status === 'REJECTED' && ev.rejectReason && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--admin-danger)', marginTop: 4, fontWeight: 500 }}>
                              Lý do từ chối: {ev.rejectReason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.btnGroup} style={{ flexWrap: 'wrap' }}>
                        <select 
                          value={ev.featuredTag || ''} 
                          onChange={(e) => handleUpdateFeatured(ev.id, e.target.value)}
                          className={styles.filterSelect}
                          style={{ padding: '0.4rem 1.5rem 0.4rem 0.625rem', minWidth: '130px', fontSize: '0.8rem', borderRadius: '8px' }}
                        >
                          <option value="">Không nổi bật</option>
                          <option value="HOT">HOT</option>
                          <option value="TRENDING">TRENDING</option>
                          <option value="SPONSORED">SPONSORED</option>
                        </select>

                        <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => setExpandedEvent(expandedEvent === ev.id ? null : ev.id)}>
                          Loại vé ({ev.ticketTypes?.length || 0})
                        </button>
                        <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => startEditEvent(ev)}>
                          Sửa
                        </button>
                        
                        {ev.status === 'PENDING' && (
                          <>
                            <button className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`} onClick={() => handleApproveEvent(ev.id)}>Duyệt</button>
                            <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => handleRejectEvent(ev.id)}>Từ chối</button>
                          </>
                        )}
                        
                        {ev.status === 'DRAFT' && <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => publishEvent(ev.id)}>Publish</button>}
                        {(ev.status === 'PUBLISHED' || ev.status === 'ONGOING') && <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={() => closeEvent(ev.id)}>Đóng</button>}
                        {(ev.status === 'PUBLISHED' || ev.status === 'ONGOING') && <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => sendMarketingEmail(ev.id)} disabled={formLoading}>Gửi quảng bá</button>}
                        <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => deleteEvent(ev.id)}>Xóa</button>
                      </div>
                    </div>

                    {expandedEvent === ev.id && (
                      <div className={styles.cardBody} style={{ background: '#f8fafc', borderTop: '1px solid var(--admin-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Chi tiết loại vé</span>
                          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => { setShowAddTicket(ev.id); setEditingTicket(null); setTicketForm({ name: '', price: '', totalQuantity: '' }); }}>+ Thêm loại vé</button>
                        </div>

                        {/* Add Ticket Form */}
                        {showAddTicket === ev.id && (
                          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#fff', borderRadius: 12, border: '1px solid var(--admin-border)' }}>
                            <h5 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>Thêm loại vé mới</h5>
                            <form onSubmit={addTicketType}>
                              <div className={styles.editFormGrid} style={{ marginBottom: '1rem' }}>
                                <div className={styles.formGroup}>
                                  <label className={styles.label}>Tên vé</label>
                                  <input className={styles.input} required placeholder="Vé VIP, Vé thường..." value={ticketForm.name} onChange={e => setTicketForm(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                  <label className={styles.label}>Giá vé (VNĐ)</label>
                                  <input className={styles.input} type="number" required min="0" placeholder="VD: 50000" value={ticketForm.price} onChange={e => setTicketForm(prev => ({ ...prev, price: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                  <label className={styles.label}>Số lượng</label>
                                  <input className={styles.input} type="number" required min="1" placeholder="VD: 100" value={ticketForm.totalQuantity} onChange={e => setTicketForm(prev => ({ ...prev, totalQuantity: e.target.value }))} />
                                </div>
                              </div>
                              <div className={styles.btnGroup}>
                                <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={formLoading}>{formLoading ? '...' : 'Xác nhận'}</button>
                                <button type="button" className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => setShowAddTicket(null)}>Hủy</button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Edit Ticket Form */}
                        {editingTicket && ev.ticketTypes?.some(t => t.id === editingTicket) && (
                          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#fff', borderRadius: 12, border: '1px solid var(--admin-warning)' }}>
                            <h5 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>Sửa thông tin loại vé</h5>
                            <form onSubmit={saveEditTicket}>
                              <div className={styles.editFormGrid} style={{ marginBottom: '1rem' }}>
                                <div className={styles.formGroup}>
                                  <label className={styles.label}>Tên vé</label>
                                  <input className={styles.input} required value={ticketForm.name} onChange={e => setTicketForm(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                  <label className={styles.label}>Giá vé (VNĐ)</label>
                                  <input className={styles.input} type="number" required min="0" value={ticketForm.price} onChange={e => setTicketForm(prev => ({ ...prev, price: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                  <label className={styles.label}>Số lượng</label>
                                  <input className={styles.input} type="number" required min="1" value={ticketForm.totalQuantity} onChange={e => setTicketForm(prev => ({ ...prev, totalQuantity: e.target.value }))} />
                                </div>
                              </div>
                              <div className={styles.btnGroup}>
                                <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={formLoading}>{formLoading ? '...' : 'Cập nhật'}</button>
                                <button type="button" className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => { setEditingTicket(null); setTicketForm({ name: '', price: '', totalQuantity: '' }); }}>Hủy</button>
                              </div>
                            </form>
                          </div>
                        )}

                        {(!ev.ticketTypes || ev.ticketTypes.length === 0) ? (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--admin-text-sub)', fontSize: '0.85rem' }}>Chưa thiết lập loại vé nào</div>
                        ) : (
                          <div className={styles.ticketBox}>
                            {ev.ticketTypes.map(tt => (
                              <div key={tt.id} className={styles.ticketRow}>
                                <div className={styles.ticketInfo}>
                                  <span className={styles.ticketTitle}>{tt.name}</span>
                                  <span className={styles.ticketMeta}>
                                    Giá: <strong style={{ color: 'var(--admin-primary)' }}>{formatMoney(tt.price)}</strong>  ·  Còn lại: {tt.availableQuantity}/{tt.totalQuantity}
                                  </span>
                                </div>
                                <div className={styles.btnGroup}>
                                  <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => openSeatManager(tt)}>Sơ đồ ghế</button>
                                  <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => startEditTicket(tt)}>Sửa</button>
                                  <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => deleteTicketType(tt.id)}>Xóa</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              {events.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-sub)' }}>Chưa có sự kiện nào. Hãy nhấn nút phía trên để tạo sự kiện mới.</div>}
            </>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <>
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h1 className={styles.title}>Quản lý người dùng</h1>
                  <p className={styles.description}>Danh sách tài khoản hệ thống: {users.length}</p>
                </div>
              </div>

              {/* Toolbar search */}
              <div className={styles.toolbar}>
                <input className={styles.searchInput} placeholder="Tìm kiếm theo họ tên hoặc email người dùng..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>

              {editingUser && (
                <div className={styles.card} style={{ marginBottom: '2rem' }}>
                  <div className={styles.cardHeader}><h4 className={styles.cardTitle}>Sửa tài khoản người dùng</h4></div>
                  <div className={styles.cardBody}>
                    <form onSubmit={saveEditUser}>
                      <div className={styles.editFormGrid} style={{ marginBottom: '1.25rem' }}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Họ tên</label>
                          <input className={styles.input} required value={userForm.fullName} onChange={e => setUserForm(prev => ({ ...prev, fullName: e.target.value }))} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Email</label>
                          <input className={styles.input} type="email" required value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Mật khẩu mới</label>
                          <input className={styles.input} type="password" placeholder="Để trống nếu giữ mật khẩu cũ" value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} />
                        </div>
                      </div>
                      <div className={styles.btnGroup}>
                        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={formLoading}>{formLoading ? '...' : 'Cập nhật'}</button>
                        <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setEditingUser(null)}>Hủy bỏ</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className={styles.card}>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>ID</th>
                        <th className={styles.th}>Họ tên</th>
                        <th className={styles.th}>Email</th>
                        <th className={styles.th}>Role (Nhấn để đổi)</th>
                        <th className={styles.th}>Xác minh (Nhấn để đổi)</th>
                        <th className={styles.th}>Ngày tạo</th>
                        <th className={styles.th} style={{ textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => {
                          const query = userSearch.toLowerCase();
                          return u.fullName?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query);
                        })
                        .map(u => (
                          <tr key={u.id} className={styles.tableRow}>
                            <td className={styles.td}>#{u.id}</td>
                            <td className={styles.td} style={{ fontWeight: 600 }}>{u.fullName}</td>
                            <td className={styles.td}>{u.email}</td>
                            <td className={styles.td}>
                              <button onClick={() => toggleRole(u.id, u.role)} className={`${styles.badge} ${u.role === 'ROLE_ADMIN' ? styles.badgeDanger : styles.badgeBlue}`} style={{ border: 'none', cursor: 'pointer' }} title="Click để thay đổi vai trò">
                                {u.role === 'ROLE_ADMIN' ? 'Admin' : 'User'}
                              </button>
                            </td>
                            <td className={styles.td}>
                              <button onClick={() => toggleVerify(u.id)} className={`${styles.badge} ${u.isVerified ? styles.badgeSuccess : styles.badgeDanger}`} style={{ border: 'none', cursor: 'pointer' }} title="Click để thay đổi xác minh">
                                {u.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                              </button>
                            </td>
                            <td className={styles.td} style={{ color: 'var(--admin-text-sub)' }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}
                            </td>
                            <td className={styles.td} style={{ textAlign: 'right' }}>
                              <div className={styles.btnGroup} style={{ justifyContent: 'flex-end' }}>
                                <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => startEditUser(u)}>Sửa</button>
                                <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => deleteUser(u.id)}>Xóa</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ORDERS */}
          {activeTab === 'orders' && (
            <>
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h1 className={styles.title}>Quản lý đơn hàng</h1>
                  <p className={styles.description}>Danh sách giao dịch mua vé: {orders.length}</p>
                </div>
                <button onClick={exportOrdersCSV} className={`${styles.btn} ${styles.btnPrimary}`}>
                  Xuất dữ liệu CSV
                </button>
              </div>

              {/* Toolbar Search & Filter */}
              <div className={styles.toolbar}>
                <input className={styles.searchInput} placeholder="Tìm kiếm đơn hàng theo mã giao dịch, email khách..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
                <select className={styles.filterSelect} value={orderFilter} onChange={e => setOrderFilter(e.target.value)}>
                  <option value="ALL">Mọi trạng thái đơn</option>
                  <option value="PAID">Đã thanh toán (PAID)</option>
                  <option value="PENDING">Chờ xác nhận (PENDING)</option>
                  <option value="FAILED">Thanh toán thất bại (FAILED)</option>
                </select>
              </div>

              <div className={styles.card}>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Mã đơn</th>
                        <th className={styles.th}>Mã giao dịch</th>
                        <th className={styles.th}>Khách hàng</th>
                        <th className={styles.th}>Tổng tiền</th>
                        <th className={styles.th}>Phương thức</th>
                        <th className={styles.th}>Trạng thái</th>
                        <th className={styles.th}>Ngày tạo</th>
                        <th className={styles.th} style={{ textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr><td colSpan={8} className={styles.td} style={{ textAlign: 'center', color: 'var(--admin-text-sub)' }}>Chưa có dữ liệu đơn hàng</td></tr>
                      ) : orders
                        .filter(o => {
                          if (orderFilter !== 'ALL' && o.status !== orderFilter) return false;
                          const query = orderSearch.toLowerCase();
                          return o.id?.toString().includes(query) || o.transactionRef?.toLowerCase().includes(query) || o.userEmail?.toLowerCase().includes(query) || o.userName?.toLowerCase().includes(query);
                        })
                        .map(o => (
                          <tr key={o.id} className={styles.tableRow}>
                            <td className={styles.td}>#{o.id}</td>
                            <td className={styles.td} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{o.transactionRef || 'N/A'}</td>
                            <td className={styles.td}>
                              <div style={{ fontWeight: 600 }}>{o.userName || 'Ẩn danh'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-sub)' }}>{o.userEmail || ''}</div>
                            </td>
                            <td className={styles.td} style={{ fontWeight: 700, color: 'var(--admin-primary)' }}>{formatMoney(o.totalAmount)}</td>
                            <td className={styles.td}><span className={`${styles.badge} ${styles.badgeGray}`}>{o.paymentMethod || '-'}</span></td>
                            <td className={styles.td}>
                              <span className={`${styles.badge} ${
                                o.status === 'PAID' ? styles.badgeSuccess : 
                                o.status === 'PENDING' ? styles.badgeWarning : 
                                styles.badgeDanger
                              }`}>{o.status}</span>
                            </td>
                            <td className={styles.td} style={{ color: 'var(--admin-text-sub)', fontSize: '0.8rem' }}>{formatDate(o.createdAt)}</td>
                            <td className={styles.td} style={{ textAlign: 'right' }}>
                              <div className={styles.btnGroup} style={{ justifyContent: 'flex-end' }}>
                                <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={() => setSelectedOrderDetails(o)}>Chi tiết</button>
                                {o.status === 'PENDING' && (
                                  <>
                                    <button className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`} onClick={() => confirmPayment(o.id)}>Duyệt</button>
                                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => rejectPayment(o.id)}>Từ chối</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* VOUCHERS */}
          {activeTab === 'vouchers' && (
            <>
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h1 className={styles.title}>Quản lý mã giảm giá (Voucher)</h1>
                  <p className={styles.description}>Khởi tạo và cấu hình mã ưu đãi cho chiến dịch marketing</p>
                </div>
              </div>

              <div className={styles.card} style={{ marginBottom: '2rem' }}>
                <div className={styles.cardHeader}><h4 className={styles.cardTitle}>Tạo mã giảm giá mới</h4></div>
                <div className={styles.cardBody}>
                  <div className={styles.editFormGrid} style={{ marginBottom: '1.25rem' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mã Voucher</label>
                      <input className={styles.input} placeholder="VD: GIAM20" value={voucherForm.code} onChange={e => setVoucherForm({...voucherForm, code: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mô tả</label>
                      <input className={styles.input} placeholder="Mô tả ngắn gọn..." value={voucherForm.description} onChange={e => setVoucherForm({...voucherForm, description: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Giảm giá theo %</label>
                      <input className={styles.input} type="number" placeholder="Nhập số % (VD: 10)" value={voucherForm.discountPercent} onChange={e => setVoucherForm({...voucherForm, discountPercent: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Giảm số tiền cố định (VNĐ)</label>
                      <input className={styles.input} type="number" placeholder="VD: 50000" value={voucherForm.discountAmount} onChange={e => setVoucherForm({...voucherForm, discountAmount: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Số lượt sử dụng tối đa</label>
                      <input className={styles.input} type="number" placeholder="VD: 100" value={voucherForm.maxUses} onChange={e => setVoucherForm({...voucherForm, maxUses: e.target.value})} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Ngày hết hạn</label>
                      <input className={styles.input} type="datetime-local" value={voucherForm.expiryDate} onChange={e => setVoucherForm({...voucherForm, expiryDate: e.target.value})} />
                    </div>
                  </div>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={async () => {
                    if (!voucherForm.code) { alert('Vui lòng nhập mã Voucher'); return; }
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
                      showMsg('success', 'Đã khởi tạo Voucher mới thành công!');
                      const r2 = await apiRequest('/vouchers/admin');
                      if (r2.success) setVouchers(r2.data);
                    } else alert(res.message);
                  }}>
                    Khởi tạo mã ưu đãi
                  </button>
                </div>
              </div>

              {/* Vouchers List */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h4 className={styles.cardTitle}>Danh sách Voucher trên hệ thống</h4>
                  <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={async () => {
                    const res = await apiRequest('/vouchers/admin');
                    if (res.success) setVouchers(res.data);
                  }}>Làm mới</button>
                </div>
                <div className={styles.cardBody}>
                  {/* Toolbar Search Voucher */}
                  <div className={styles.toolbar}>
                    <input className={styles.searchInput} placeholder="Tìm kiếm theo mã voucher hoặc mô tả..." value={voucherSearch} onChange={e => setVoucherSearch(e.target.value)} />
                  </div>

                  {vouchers.length === 0 ? (
                    <p style={{ color: 'var(--admin-text-sub)', textAlign: 'center', padding: '2rem' }}>Chưa có mã voucher nào được khởi tạo</p>
                  ) : (
                    <div className={styles.tableResponsive}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.th}>Mã</th>
                            <th className={styles.th}>Mô tả</th>
                            <th className={styles.th} style={{ textAlign: 'center' }}>Mức giảm</th>
                            <th className={styles.th} style={{ textAlign: 'center' }}>Lượt dùng</th>
                            <th className={styles.th} style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th className={styles.th} style={{ textAlign: 'right' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vouchers
                            .filter(v => {
                              const query = voucherSearch.toLowerCase();
                              return v.code?.toLowerCase().includes(query) || v.description?.toLowerCase().includes(query);
                            })
                            .map(v => (
                              <tr key={v.id} className={styles.tableRow}>
                                <td className={styles.td} style={{ fontWeight: 700, color: 'var(--admin-primary)' }}>{v.code}</td>
                                <td className={styles.td}>{v.description || 'Không có mô tả'}</td>
                                <td className={styles.td} style={{ textAlign: 'center', fontWeight: 600 }}>
                                  {v.discountPercent ? `${v.discountPercent}%` : v.discountAmount ? `${new Intl.NumberFormat('vi-VN').format(v.discountAmount)}đ` : '-'}
                                </td>
                                <td className={styles.td} style={{ textAlign: 'center' }}>{v.currentUses}/{v.maxUses || 'Không giới hạn'}</td>
                                <td className={styles.td} style={{ textAlign: 'center' }}>
                                  <span className={`${styles.badge} ${v.isActive ? styles.badgeSuccess : styles.badgeDanger}`}>
                                    {v.isActive ? 'Đang hoạt động' : 'Vô hiệu'}
                                  </span>
                                </td>
                                <td className={styles.td} style={{ textAlign: 'right' }}>
                                  <button onClick={async () => {
                                    if(confirm('Xóa mã giảm giá này?')) {
                                      await apiRequest(`/vouchers/admin/${v.id}`, { method: 'DELETE' });
                                      setVouchers(prev => prev.filter(x => x.id !== v.id));
                                      showMsg('success', 'Đã xóa mã voucher!');
                                    }
                                  }} className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}>Xóa</button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* AGENCIES */}
          {activeTab === 'agencies' && (
            <>
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h1 className={styles.title}>Quản lý đối tác đại lý</h1>
                  <p className={styles.description}>Số lượng yêu cầu đối tác: {agencies.length}</p>
                </div>
                <button onClick={() => loadAgencies()} className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}>
                  Làm mới bảng
                </button>
              </div>

              {/* Sub tabs for Agencies */}
              <div className={styles.subTabs}>
                <button onClick={() => setAgencyTab('pending')} className={`${styles.subTabBtn} ${agencyTab === 'pending' ? styles.subTabBtnActive : ''}`}>
                  Yêu cầu chờ duyệt ({agencyTab === 'pending' ? agencies.length : '...'})
                </button>
                <button onClick={() => setAgencyTab('approved')} className={`${styles.subTabBtn} ${agencyTab === 'approved' ? styles.subTabBtnActive : ''}`}>
                  Đại lý đang hoạt động ({agencyTab === 'approved' ? agencies.length : '...'})
                </button>
              </div>

              {/* Toolbar search */}
              <div className={styles.toolbar}>
                <input className={styles.searchInput} placeholder="Tìm đại lý theo tên tổ chức, đại diện..." value={agencySearch} onChange={e => setAgencySearch(e.target.value)} />
              </div>

              {agenciesLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }}></div>
                </div>
              ) : (
                <div className={styles.card}>
                  <div className={styles.tableResponsive}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>ID</th>
                          <th className={styles.th}>Tên tổ chức</th>
                          <th className={styles.th}>Người đại diện</th>
                          <th className={styles.th}>Thông tin liên hệ</th>
                          <th className={styles.th}>Ngày tạo</th>
                          <th className={styles.th}>Trạng thái</th>
                          <th className={styles.th} style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agencies.length === 0 ? (
                          <tr><td colSpan={7} className={styles.td} style={{ textAlign: 'center', color: 'var(--admin-text-sub)' }}>Không tìm thấy dữ liệu đại lý</td></tr>
                        ) : agencies
                          .filter(a => {
                            const query = agencySearch.toLowerCase();
                            return a.organizationName?.toLowerCase().includes(query) || a.user?.fullName?.toLowerCase().includes(query) || a.contactEmail?.toLowerCase().includes(query);
                          })
                          .map(a => (
                            <tr key={a.id} className={styles.tableRow}>
                              <td className={styles.td}>#{a.id}</td>
                              <td className={styles.td} style={{ fontWeight: 700 }}>{a.organizationName}</td>
                              <td className={styles.td}>
                                <div style={{ fontWeight: 600 }}>{a.user?.fullName || '-'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-sub)' }}>User ID: #{a.user?.id}</div>
                              </td>
                              <td className={styles.td}>
                                <div>Email: {a.contactEmail}</div>
                                <div>SĐT: {a.contactPhone}</div>
                              </td>
                              <td className={styles.td} style={{ color: 'var(--admin-text-sub)' }}>{formatDate(a.createdAt)}</td>
                              <td className={styles.td}>
                                <span className={`${styles.badge} ${
                                  a.status === 'APPROVED' ? styles.badgeSuccess : 
                                  a.status === 'PENDING' ? styles.badgeWarning : 
                                  styles.badgeDanger
                                }`}>{a.status}</span>
                              </td>
                              <td className={styles.td} style={{ textAlign: 'right' }}>
                                {a.status === 'PENDING' && (
                                  <div className={styles.btnGroup} style={{ justifyContent: 'flex-end' }}>
                                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => handleApproveAgency(a.id)}>Duyệt</button>
                                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => handleRejectAgency(a.id)}>Từ chối</button>
                                  </div>
                                )}
                                {a.status === 'APPROVED' && (
                                  <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => handleBlockAgency(a.id)}>Khóa đại lý</button>
                                )}
                                {a.status === 'BLOCKED' && (
                                  <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => handleUnblockAgency(a.id)}>Mở khóa</button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* SEAT MANAGER MODAL */}
      {seatManagerTicket && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setSeatManagerTicket(null); }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Thiết lập sơ đồ ghế</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-sub)', margin: '4px 0 0' }}>Loại vé: <strong>{seatManagerTicket.name}</strong></p>
              </div>
              <button onClick={() => setSeatManagerTicket(null)} className={styles.modalClose}>×</button>
            </div>

            <div style={{ background: seatManagerTicket.seatCount > 0 ? '#ecfdf5' : '#fffbeb', border: `1px solid ${seatManagerTicket.seatCount > 0 ? '#a7f3d0' : '#fde68a'}`, borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 4px' }}>
                {seatManagerTicket.seatCount > 0 ? `Đã khởi tạo ${seatManagerTicket.seatCount} vị trí ghế` : 'Chưa thiết lập sơ đồ vị trí ngồi'}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-sub)', margin: 0 }}>
                {seatManagerTicket.seatCount > 0 ? 'Hành động tạo mới sơ đồ sẽ xóa toàn bộ danh sách ghế ngồi cũ và không thể khôi phục.' : 'Tạo sơ đồ giúp người mua vé chọn được vị trí ngồi tương ứng khi giao dịch.'}
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', margin: '0 0 1rem' }}>Cấu hình sơ đồ hàng & cột</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số hàng (A, B, C...)</label>
                  <input type="number" min="1" max="26" className={styles.input} style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }} value={seatConfig.rows} onChange={e => setSeatConfig(prev => ({ ...prev, rows: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số cột (01, 02...)</label>
                  <input type="number" min="1" max="50" className={styles.input} style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }} value={seatConfig.cols} onChange={e => setSeatConfig(prev => ({ ...prev, cols: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--admin-primary-light)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--admin-primary-dark)', textAlign: 'center', fontWeight: 600 }}>
                Tổng cộng: {Number(seatConfig.rows) * Number(seatConfig.cols)} ghế ngồi
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generateSeats} disabled={seatLoading} className={`${styles.btn} ${styles.btnPrimary}`} style={{ flex: 1, padding: '0.8rem' }}>
                {seatLoading ? 'Đang tạo sơ đồ...' : seatManagerTicket.seatCount > 0 ? 'Tạo lại (Reset)' : 'Xác nhận tạo ghế'}
              </button>
              <button onClick={() => setSeatManagerTicket(null)} className={`${styles.btn} ${styles.btnOutline}`} style={{ padding: '0.8rem 1.2rem' }}>Hủy bỏ</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM MODAL */}
      {confirmDialog.show && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle} style={{ marginBottom: '0.75rem' }}>{confirmDialog.title}</h3>
            <p style={{ color: 'var(--admin-text-sub)', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))} className={`${styles.btn} ${styles.btnOutline}`}>Hủy bỏ</button>
              <button onClick={confirmDialog.onConfirm} className={`${styles.btn} ${styles.btnPrimary}`}>Đồng ý</button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT EVENT MODAL */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle} style={{ marginBottom: '0.75rem' }}>Từ chối duyệt sự kiện</h3>
            <form onSubmit={submitRejectEvent}>
              <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
                <label className={styles.label}>Lý do từ chối</label>
                <textarea className={styles.input} style={{ minHeight: '100px', resize: 'vertical' }} placeholder="Nhập lý do cụ thể gửi tới nhà tổ chức..." required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowRejectModal(false)} className={`${styles.btn} ${styles.btnOutline}`}>Hủy bỏ</button>
                <button type="submit" className={`${styles.btn} ${styles.btnDanger}`}>Từ chối duyệt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {selectedOrderDetails && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '600px', width: '90%' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Chi tiết đơn hàng #{selectedOrderDetails.id}</h3>
              <button onClick={() => setSelectedOrderDetails(null)} className={styles.modalClose}>&times;</button>
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '6px' }}>
              {/* Customer Info */}
              <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--admin-text-main)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Thông tin khách hàng</div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Họ và tên:</span><span className={styles.infoValue}>{selectedOrderDetails.userName || 'Ẩn danh'}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Email:</span><span className={styles.infoValue}>{selectedOrderDetails.userEmail || 'Không có'}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Điện thoại:</span><span className={styles.infoValue}>{selectedOrderDetails.userPhone || 'Không có'}</span></div>
              </div>

              {/* Transaction Info */}
              <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--admin-text-main)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Chi tiết giao dịch</div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Mã tham chiếu:</span><span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{selectedOrderDetails.transactionRef || 'N/A'}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Phương thức:</span><span className={styles.infoValue}><span className={`${styles.badge} ${styles.badgeGray}`}>{selectedOrderDetails.paymentMethod}</span></span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Trạng thái:</span><span className={styles.infoValue}>
                  <span className={`${styles.badge} ${
                    selectedOrderDetails.status === 'PAID' ? styles.badgeSuccess : 
                    selectedOrderDetails.status === 'PENDING' ? styles.badgeWarning : 
                    styles.badgeDanger
                  }`}>{selectedOrderDetails.status}</span>
                </span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Thời gian tạo:</span><span className={styles.infoValue}>{formatDate(selectedOrderDetails.createdAt)}</span></div>
                {selectedOrderDetails.voucherCode && (
                  <div className={styles.infoRow}><span className={styles.infoLabel}>Mã giảm giá:</span><span className={styles.infoValue} style={{ color: 'var(--admin-warning)', fontWeight: 700 }}>{selectedOrderDetails.voucherCode}</span></div>
                )}
                {selectedOrderDetails.discountAmount && Number(selectedOrderDetails.discountAmount) > 0 && (
                  <div className={styles.infoRow}><span className={styles.infoLabel}>Số tiền giảm:</span><span className={styles.infoValue} style={{ color: 'var(--admin-danger)' }}>-{formatMoney(selectedOrderDetails.discountAmount)}</span></div>
                )}
                <div className={styles.infoRow}><span className={styles.infoLabel}>Tổng tiền thanh toán:</span><span className={styles.infoValue} style={{ fontSize: '1.1rem', color: 'var(--admin-primary)', fontWeight: 800 }}>{formatMoney(selectedOrderDetails.totalAmount)}</span></div>
              </div>

              {/* Tickets Info */}
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--admin-text-main)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Vé đã mua ({selectedOrderDetails.tickets?.length || 0})</div>
                {selectedOrderDetails.tickets && selectedOrderDetails.tickets.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedOrderDetails.tickets.map((t, idx) => (
                      <div key={idx} style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--admin-border)', borderRadius: '10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-main)' }}>{t.eventTitle || 'Sự kiện'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-sub)', marginTop: '0.25rem' }}>
                          Loại vé: <span style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{t.ticketTypeName}</span> | Ghế: <span style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>{t.seatName || 'Không số'}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-sub)', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Mã vé: <span style={{ fontFamily: 'monospace' }}>{t.qrToken?.substring(0, 15)}...</span></span>
                          <span style={{ fontWeight: 700, color: t.checkinStatus === 'USED' ? 'var(--admin-primary)' : 'var(--admin-text-sub)' }}>
                            {t.checkinStatus === 'USED' ? 'ĐÃ CHECK-IN' : 'CHƯA SỬ DỤNG'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-sub)', textAlign: 'center', padding: '1rem' }}>Không tìm thấy chi tiết vé.</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
              {selectedOrderDetails.status === 'PENDING' && (
                <>
                  <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={() => { confirmPayment(selectedOrderDetails.id); setSelectedOrderDetails(null); }}>Duyệt thanh toán</button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => { rejectPayment(selectedOrderDetails.id); setSelectedOrderDetails(null); }}>Từ chối</button>
                </>
              )}
              <button onClick={() => setSelectedOrderDetails(null)} className={`${styles.btn} ${styles.btnOutline}`}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== FULL ANALYTICS REPORT MODAL ==================== */}
      {showFullReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Báo cáo phân tích chi tiết</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Bảng số liệu thống kê hoạt động & doanh thu theo ngày</span>
              </div>
              <button 
                onClick={() => setShowFullReport(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>Ngày</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Số vé bán</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Đơn hàng</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const salesData = stats.salesByDate || [];
                    const hasSalesData = salesData.length > 0;
                    const lineChartData = hasSalesData ? salesData : [
                      { date: '2026-06-22', ticketsSold: 5, ordersCount: 2, revenue: 1500000 },
                      { date: '2026-06-23', ticketsSold: 8, ordersCount: 4, revenue: 2400000 },
                      { date: '2026-06-24', ticketsSold: 12, ordersCount: 6, revenue: 3800000 },
                      { date: '2026-06-25', ticketsSold: 15, ordersCount: 7, revenue: 4500000 },
                      { date: '2026-06-26', ticketsSold: 9, ordersCount: 4, revenue: 2700000 },
                      { date: '2026-06-27', ticketsSold: 20, ordersCount: 10, revenue: 6000000 },
                      { date: '2026-06-28', ticketsSold: 14, ordersCount: 6, revenue: 4200000 },
                    ];
                    return lineChartData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', height: '40px' }}>
                        <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 600 }}>{row.date}</td>
                        <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>{row.ticketsSold} vé</td>
                        <td style={{ padding: '10px 12px', color: '#3b82f6', fontWeight: 700, textAlign: 'center' }}>{row.ordersCount || 0}</td>
                        <td style={{ padding: '10px 12px', color: '#8b5cf6', fontWeight: 700, textAlign: 'right' }}>{formatMoney(row.revenue || 0)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleExportReport}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Xuất file CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
