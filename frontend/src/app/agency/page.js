'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiRequest, isLoggedIn, setUser } from '@/lib/api';

export default function AgencyDashboard() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ organizationName: '', contactPhone: '', contactEmail: '' });
  const [regLoading, setRegLoading] = useState(false);

  // Agency Stats & Data
  const [events, setEvents] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  
  // Payout
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: '', bankName: '', bankAccountNumber: '', bankAccountName: '' });
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Event Creation
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', location: '', startTime: '', endTime: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Event Management (Edit/Tickets)
  const [managingEvent, setManagingEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({ id: null, name: '', price: 0, totalQuantity: 0 });

  // Seat Management
  const [seatManagerTicket, setSeatManagerTicket] = useState(null);
  const [seatConfig, setSeatConfig] = useState({ rows: 10, cols: 10 });
  const [seatLoading, setSeatLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await apiRequest('/profile');
      if (res.success) {
        setUserProfile(res.data);
        setUser({
          userId: res.data.id,
          fullName: res.data.fullName,
          email: res.data.email,
          role: res.data.role,
          agencyStatus: res.data.agencyStatus,
        });
        if (res.data.role === 'ROLE_ADMIN') {
          router.push('/admin');
          return;
        }
        if (res.data.role === 'ROLE_ORGANIZER' && res.data.agencyStatus === 'APPROVED') {
          loadAgencyData();
        } else {
          setRegForm(prev => ({ ...prev, contactEmail: res.data.email || '' }));
        }
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAgencyData = async () => {
    try {
      const eRes = await apiRequest('/events/my-events');
      if (eRes.success) {
        setEvents(eRes.data || []);
      }
      
      const statsRes = await apiRequest('/organizers/stats');
      if (statsRes.success) {
        setDashboardStats(statsRes.data);
      }

      const customersRes = await apiRequest('/organizers/customers');
      if (customersRes.success) {
        setCustomers(customersRes.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      const res = await apiRequest('/organizers/requests', {
        method: 'POST',
        body: JSON.stringify(regForm)
      });
      if (res.success) {
        alert('Gửi yêu cầu thành công! Vui lòng chờ admin phê duyệt.');
        loadProfile(); // Reload profile to update agencyStatus
      } else {
        alert(res.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Lỗi kết nối');
    } finally {
      setRegLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { alert('File quá lớn (Tối đa 5MB)'); return; }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
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
      if (!data.success) { alert(data.message); }
    } catch (e) { alert('Lỗi upload ảnh'); }
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...eventForm };
      payload.startTime += ':00';
      payload.endTime += ':00';
      payload.categoryId = 1; // Default
      
      const res = await apiRequest('/events/create', { method: 'POST', body: JSON.stringify(payload) });
      if(res.success) {
        const eventId = res.data.id;
        if(selectedImage) {
          const formData = new FormData();
          formData.append('file', selectedImage);
          try {
            await fetch(`http://localhost:8080/api/events/${eventId}/upload-image`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: formData
            });
          } catch(e) {
            console.error('Lỗi upload ảnh:', e);
          }
        }
        alert('Tạo sự kiện thành công! Chờ duyệt.');
        setShowCreateEvent(false);
        setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '' });
        clearImageSelection();
        loadAgencyData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setFormLoading(false);
    }
  };

  // --- Event Management Functions ---
  const handleManageEvent = async (ev) => {
    setManagingEvent(ev);
    setEventForm({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      startTime: ev.startTime ? ev.startTime.substring(0, 16) : '',
      endTime: ev.endTime ? ev.endTime.substring(0, 16) : ''
    });
    setShowCreateEvent(false);
    await loadTicketTypes(ev.id);
  };

  const loadTicketTypes = async (eventId) => {
    try {
      const res = await apiRequest(`/events/${eventId}/ticket-types`);
      if (res.success) setTicketTypes(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const updateEvent = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = { ...eventForm };
      payload.startTime += ':00';
      payload.endTime += ':00';
      payload.categoryId = 1;
      
      const res = await apiRequest(`/events/my-events/${eventForm.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if(res.success) {
        if(selectedImage) {
          const formData = new FormData();
          formData.append('file', selectedImage);
          try {
            await fetch(`http://localhost:8080/api/events/${eventForm.id}/upload-image`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: formData
            });
          } catch(e) {}
        }
        alert('Cập nhật sự kiện thành công!');
        // Update local state without closing manager
        setManagingEvent(prev => ({...prev, ...payload}));
        clearImageSelection();
        loadAgencyData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.')) return;
    try {
      const res = await apiRequest(`/events/my-events/${eventId}`, { method: 'DELETE' });
      if (res.success) {
        alert('Đã xóa sự kiện.');
        setManagingEvent(null);
        loadAgencyData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const publishEvent = async (eventId) => {
    if (!confirm('Bạn có chắc chắn muốn duyệt và xuất bản sự kiện này? Khán giả sẽ có thể thấy và mua vé ngay.')) return;
    try {
      const res = await apiRequest(`/events/my-events/${eventId}/publish`, { method: 'POST' });
      if (res.success) {
        alert('Đã xuất bản sự kiện thành công.');
        setManagingEvent(prev => ({ ...prev, status: 'PUBLISHED' }));
        loadAgencyData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const closeEvent = async (eventId) => {
    if (!confirm('Bạn có chắc chắn muốn đóng sự kiện này? Khán giả sẽ không thể mua vé nữa.')) return;
    try {
      const res = await apiRequest(`/events/my-events/${eventId}/close`, { method: 'POST' });
      if (res.success) {
        alert('Đã đóng sự kiện.');
        setManagingEvent(prev => ({ ...prev, status: 'CLOSED' }));
        loadAgencyData();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    try {
      const isUpdate = !!ticketForm.id;
      const url = isUpdate ? `/events/my-events/ticket-types/${ticketForm.id}` : `/events/my-events/${managingEvent.id}/ticket-types`;
      const method = isUpdate ? 'PUT' : 'POST';
      const payload = {
        name: ticketForm.name,
        price: Number(ticketForm.price),
        totalQuantity: Number(ticketForm.totalQuantity)
      };

      const res = await apiRequest(url, { method, body: JSON.stringify(payload) });
      if (res.success) {
        alert(isUpdate ? 'Đã cập nhật vé!' : 'Đã thêm vé!');
        setShowTicketForm(false);
        loadTicketTypes(managingEvent.id);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const settleEvent = async (eventId) => {
    if (!confirm('Bạn có chắc muốn chốt doanh thu sự kiện này? Thao tác này sẽ chuyển số dư tạm giữ của sự kiện thành số dư khả dụng.')) return;
    try {
      const res = await apiRequest(`/payouts/events/${eventId}/settle`, { method: 'POST' });
      if (res.success || res.message === "Chốt doanh thu thành công") {
        alert('Đã chốt doanh thu thành công!');
        loadProfile(); // update balances
        loadAgencyData(); // update event status
      } else {
        alert(res.message || 'Lỗi chốt doanh thu');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const submitPayout = async (e) => {
    e.preventDefault();
    setPayoutLoading(true);
    try {
      const payload = {
          amount: Number(payoutForm.amount),
          bankName: payoutForm.bankName,
          bankAccountNumber: payoutForm.bankAccountNumber,
          bankAccountName: payoutForm.bankAccountName
      };
      const res = await apiRequest('/payouts/request', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success || res.data) {
        alert('Yêu cầu rút tiền đã được gửi và đang chờ xử lý!');
        setShowPayoutModal(false);
        setPayoutForm({ amount: '', bankName: '', bankAccountNumber: '', bankAccountName: '' });
        loadProfile(); // update balance
      } else {
        alert(res.message || 'Lỗi rút tiền');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setPayoutLoading(false);
    }
  };

  const deleteTicketType = async (ticketId) => {
    if (!confirm('Xóa loại vé này?')) return;
    try {
      const res = await apiRequest(`/events/my-events/ticket-types/${ticketId}`, { method: 'DELETE' });
      if (res.success) {
        alert('Đã xóa loại vé.');
        loadTicketTypes(managingEvent.id);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const openSeatManager = async (tt) => {
    setSeatManagerTicket({ id: tt.id, name: tt.name, seatCount: 0 }); // Placeholder
    setSeatConfig({ rows: 10, cols: 10 });
    setSeatLoading(true);
    try {
      const res = await apiRequest(`/events/my-events/ticket-types/${tt.id}/seats/count`);
      if (res.success) {
        setSeatManagerTicket({ id: tt.id, name: tt.name, seatCount: res.data.seatCount });
      }
    } catch (e) { alert('Lỗi tải thông tin ghế'); }
    finally { setSeatLoading(false); }
  };

  const generateSeats = async () => {
    setSeatLoading(true);
    try {
      const res = await apiRequest(`/events/my-events/ticket-types/${seatManagerTicket.id}/seats/generate`, {
        method: 'POST',
        body: JSON.stringify({ rows: Number(seatConfig.rows), cols: Number(seatConfig.cols) })
      });
      if (res.success) {
        alert(res.message);
        setSeatManagerTicket(prev => ({ ...prev, seatCount: res.data.seatsCreated }));
      } else { alert(res.message); }
    } catch (e) { alert('Lỗi tạo ghế'); }
    finally { setSeatLoading(false); }
  };

  const handleExportCsv = async (eventId, title) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8080/api/organizers/events/${eventId}/export-csv`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Khach_hang_${title.replace(/\\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Lỗi khi xuất file CSV');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    }
  };

  const renderEventForm = () => {
    const isEdit = !!managingEvent;
    return (
    <div style={s.card}>
      <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1.1rem' }}>{isEdit ? 'Chỉnh sửa thông tin cơ bản' : 'Tạo sự kiện mới'}</h4>
      <form onSubmit={isEdit ? updateEvent : submitEvent}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={s.label}>Tên sự kiện</label>
          <input style={s.input} required value={eventForm.title} onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={s.label}>Mô tả</label>
          <textarea style={{ ...s.input, resize: 'vertical' }} required rows={3} value={eventForm.description} onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={s.label}>Địa điểm</label>
          <input style={s.input} required value={eventForm.location} onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div><label style={s.label}>Bắt đầu</label><input style={s.input} type="datetime-local" required value={eventForm.startTime} onChange={e => setEventForm(prev => ({ ...prev, startTime: e.target.value }))} /></div>
          <div><label style={s.label}>Kết thúc</label><input style={s.input} type="datetime-local" required value={eventForm.endTime} onChange={e => setEventForm(prev => ({ ...prev, endTime: e.target.value }))} /></div>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={s.label}>Hình ảnh</label>
          <input type="file" accept="image/*" onChange={handleImageSelect} style={{ marginBottom: 10 }} />
          {imagePreview && <img src={imagePreview} style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 8 }} alt="preview" />}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" style={s.btn} disabled={formLoading}>{formLoading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Lưu Sự Kiện')}</button>
          <button type="button" style={{ ...s.btn, background: '#e2e8f0', color: '#4a5568' }} onClick={() => { setShowCreateEvent(false); setManagingEvent(null); }}>Hủy</button>
        </div>
      </form>
    </div>
  );
  };

  const renderTicketManagement = () => (
    <div style={{ ...s.card, marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Quản lý Loại vé</h4>
        {!showTicketForm && <button onClick={() => { setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0 }); setShowTicketForm(true); }} style={{ ...s.btn, width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}>+ Thêm vé</button>}
      </div>

      {showTicketForm && (
        <form onSubmit={submitTicket} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><label style={s.label}>Tên vé (VD: VIP)</label><input style={s.input} required value={ticketForm.name} onChange={e => setTicketForm({...ticketForm, name: e.target.value})} /></div>
            <div><label style={s.label}>Giá (VNĐ)</label><input style={s.input} type="number" min="0" required value={ticketForm.price} onChange={e => setTicketForm({...ticketForm, price: e.target.value})} /></div>
            <div><label style={s.label}>Số lượng (Tối đa)</label><input style={s.input} type="number" min="1" required value={ticketForm.totalQuantity} onChange={e => setTicketForm({...ticketForm, totalQuantity: e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ ...s.btn, width: 'auto' }}>Lưu vé</button>
            <button type="button" style={{ ...s.btn, width: 'auto', background: '#e2e8f0', color: '#4a5568' }} onClick={() => setShowTicketForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {ticketTypes.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>Sự kiện chưa có vé nào.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px 0', color: '#4a5568' }}>Tên vé</th>
              <th style={{ padding: '10px 0', color: '#4a5568' }}>Giá</th>
              <th style={{ padding: '10px 0', color: '#4a5568' }}>Số lượng</th>
              <th style={{ padding: '10px 0', color: '#4a5568', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {ticketTypes.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 0', fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: '10px 0', color: '#0ea5e9', fontWeight: 600 }}>{Number(t.price).toLocaleString('vi-VN')} đ</td>
                <td style={{ padding: '10px 0' }}>{t.totalQuantity} (Còn {t.availableQuantity})</td>
                <td style={{ padding: '10px 0', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => openSeatManager(t)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Tạo ghế</button>
                  <button onClick={() => { setTicketForm({ id: t.id, name: t.name, price: t.price, totalQuantity: t.totalQuantity }); setShowTicketForm(true); }} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Sửa</button>
                  <button onClick={() => deleteTicketType(t.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Seat Manager UI */}
      {seatManagerTicket && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
          <h5 style={{ fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
            Sơ đồ ghế: <span style={{ color: '#0ea5e9' }}>{seatManagerTicket.name}</span>
          </h5>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1rem' }}>
            Số lượng ghế hiện tại trong hệ thống: <strong style={{ color: '#10b981', fontSize: '1rem' }}>{seatManagerTicket.seatCount}</strong> ghế.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={s.label}>Số hàng ghế</label>
              <input style={s.input} type="number" min="1" max="50" value={seatConfig.rows} onChange={e => setSeatConfig({...seatConfig, rows: e.target.value})} />
            </div>
            <div>
              <label style={s.label}>Số ghế mỗi hàng</label>
              <input style={s.input} type="number" min="1" max="50" value={seatConfig.cols} onChange={e => setSeatConfig({...seatConfig, cols: e.target.value})} />
            </div>
          </div>
          <div style={{ background: '#fffbeb', color: '#d97706', padding: '10px', borderRadius: 8, fontSize: '0.8rem', marginBottom: '1rem', border: '1px solid #fde68a' }}>
            <strong>Lưu ý:</strong> Hành động này sẽ xóa toàn bộ ghế cũ của loại vé này và tạo lại sơ đồ ghế mới. Sẽ tạo ra tổng cộng {Number(seatConfig.rows) * Number(seatConfig.cols)} ghế mới.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={generateSeats} disabled={seatLoading} style={{ ...s.btn, width: 'auto', background: '#3b82f6' }}>
              {seatLoading ? 'Đang tạo...' : 'Tạo sơ đồ ghế'}
            </button>
            <button onClick={() => setSeatManagerTicket(null)} style={{ ...s.btn, width: 'auto', background: '#e2e8f0', color: '#4a5568' }}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );

  const s = {
    page: { display: 'flex', minHeight: 'calc(100vh - 60px)', paddingTop: 64, background: '#f8fafc', color: '#1a1a2e' },
    sidebar: { width: 240, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' },
    sidebarTitle: { padding: '1.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#1a1a2e', borderBottom: '1px solid #f0f0f5' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: active ? 600 : 400, color: active ? '#00B46E' : '#4a5568', background: active ? 'rgba(0,180,110,0.06)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: active ? '3px solid #00B46E' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left', fontFamily: 'inherit' }),
    main: { flex: 1, padding: '2rem', maxWidth: 1100, margin: '0 auto' },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '2rem', marginBottom: '1rem' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', marginBottom: 4 },
    btn: { padding: '10px 16px', background: '#00B46E', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', width: '100%' },
    badge: (bg, color) => ({ padding: '4px 10px', background: bg, color: color, borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, marginLeft: 5 })
  };

  if (loading) return <><Navbar /><div style={{ ...s.page, alignItems: 'center', justifyContent: 'center' }}>Loading...</div></>;

  if (userProfile?.role === 'ROLE_ADMIN') {
    return (
      <>
        <Navbar />
        <div style={s.page}>
          <div style={s.main}>
            <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Quyền Quản Trị</h2>
              <p style={{ color: '#4a5568', marginBottom: '20px' }}>Tài khoản Admin không cần đăng ký làm đại lý.</p>
              <a href="/admin" style={{ ...s.btn, textDecoration: 'none', display: 'inline-block' }}>Đến Kênh Admin</a>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isApprovedAgency = userProfile?.role === 'ROLE_ORGANIZER' && userProfile?.agencyStatus === 'APPROVED';

  if (!isApprovedAgency) {
    return (
      <>
        <Navbar />
        <div style={s.page}>
          <div style={s.main}>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Đăng ký Đại lý Bán vé</h2>
              
              {userProfile?.agencyStatus === 'PENDING' ? (
                <div style={s.card}>
                  <h3 style={{ color: '#0ea5e9' }}>Đang chờ phê duyệt</h3>
                  <p style={{ marginTop: 10, color: '#4a5568', fontSize: '0.9rem' }}>Yêu cầu đăng ký đại lý của bạn đã được gửi. Vui lòng chờ Ban quản trị phê duyệt.</p>
                </div>
              ) : (
                <>
                  {userProfile?.agencyStatus === 'REJECTED' && (
                    <div style={{ ...s.card, borderTop: '4px solid #ef4444' }}>
                      <h3 style={{ color: '#ef4444' }}>Yêu cầu bị từ chối</h3>
                      <p style={{ marginTop: 10, color: '#4a5568', fontSize: '0.9rem' }}>Yêu cầu của bạn không đủ điều kiện. Bạn có thể thử gửi lại form bên dưới.</p>
                    </div>
                  )}
                  <div style={s.card}>
                    <p style={{ marginBottom: '1.5rem', color: '#4a5568', fontSize: '0.9rem' }}>Trở thành đại lý để tạo và quản lý sự kiện, đồng thời nhận 80% doanh thu từ việc bán vé.</p>
                    <form onSubmit={submitRegistration}>
                      <div>
                        <label style={s.label}>Tên công ty / Tổ chức</label>
                        <input style={s.input} required value={regForm.organizationName} onChange={e => setRegForm({...regForm, organizationName: e.target.value})} placeholder="VD: CLB Tin học" />
                      </div>
                      <div>
                        <label style={s.label}>Số điện thoại liên hệ</label>
                        <input style={s.input} required value={regForm.contactPhone} onChange={e => setRegForm({...regForm, contactPhone: e.target.value})} placeholder="VD: 0912345678" />
                      </div>
                      <div>
                        <label style={s.label}>Email liên hệ</label>
                        <input type="email" style={s.input} required value={regForm.contactEmail} onChange={e => setRegForm({...regForm, contactEmail: e.target.value})} placeholder="Email để liên hệ" />
                      </div>
                      <button type="submit" style={s.btn} disabled={regLoading}>
                        {regLoading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  const renderDailySalesChart = () => {
    if (!dashboardStats || !dashboardStats.salesByDate || dashboardStats.salesByDate.length === 0) {
      return (
        <div style={{ ...s.card, marginTop: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          Chưa có dữ liệu doanh số bán vé theo ngày.
        </div>
      );
    }

    const data = dashboardStats.salesByDate;
    const maxRevenue = Math.max(...data.map(d => Number(d.revenue)), 1);

    return (
      <div style={{ ...s.card, marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.2rem', color: '#1e293b' }}>Thống kê doanh số bán vé theo ngày (80% Doanh thu thực nhận)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 12, overflowX: 'auto', paddingBottom: 10, paddingTop: 20 }}>
          {data.map((d, index) => {
            const heightPercent = (Number(d.revenue) / maxRevenue) * 120; // max height 120px
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 60 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
                  {Number(d.revenue) > 0 ? `${(Number(d.revenue)/1000).toFixed(0)}k` : '0'}
                </div>
                <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'flex-end', background: '#f1f5f9', borderRadius: 6 }}>
                  <div 
                    style={{ width: '100%', height: Math.max(heightPercent, 6), background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', borderRadius: 6, transition: 'height 0.3s ease', cursor: 'pointer' }} 
                    title={`Ngày: ${d.date}\nDoanh thu: ${Number(d.revenue).toLocaleString('vi-VN')} đ\nSố vé bán: ${d.ticketsSold}`} 
                  />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 8, whiteSpace: 'nowrap' }}>
                  {d.date.substring(5)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div style={s.page}>
        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Kênh Đại Lý</div>
          <button onClick={() => setActiveTab('dashboard')} style={s.navItem(activeTab === 'dashboard')}>Tổng quan</button>
          <button onClick={() => setActiveTab('events')} style={s.navItem(activeTab === 'events')}>Quản lý Sự kiện</button>
          <button onClick={() => setActiveTab('customers')} style={s.navItem(activeTab === 'customers')}>Danh sách Khách hàng</button>
          <Link href="/admin/checkin" style={{ display: 'block', padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: 600, color: '#fff', background: '#00B46E', borderRadius: 8, margin: '1rem', textDecoration: 'none', textAlign: 'center' }}>
            Quét QR Check-in
          </Link>
        </aside>
        <main style={s.main}>
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Tổng quan Kênh đại lý</h2>
              
              {/* Financial Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={s.card}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Số dư khả dụng (Rút tiền)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0ea5e9', marginTop: 10 }}>
                    {Number(userProfile?.balance || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <button onClick={() => setShowPayoutModal(true)} style={{ ...s.btn, background: '#f1f5f9', color: '#0f172a', marginTop: '1rem' }}>Rút tiền</button>
                </div>
                <div style={s.card}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Số dư tạm giữ (Đang bán)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginTop: 10 }}>
                    {Number(userProfile?.holdingBalance || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>Sẽ chuyển sang khả dụng sau khi sự kiện kết thúc 24h</div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                <div style={{ ...s.card, padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Tổng lượt xem</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', marginTop: 8 }}>
                    {dashboardStats?.totalViews || 0}
                  </div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Vé đã bán</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: 8 }}>
                    {dashboardStats?.ticketsSold || 0} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>/ {dashboardStats?.totalCapacity || 0} vé</span>
                  </div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Doanh thu tạm tính (80%)</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: 8 }}>
                    {Number(dashboardStats?.totalRevenue || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {renderDailySalesChart()}
              
              {showPayoutModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                  <div style={{ background: '#fff', padding: '2rem', borderRadius: 12, width: '100%', maxWidth: 500 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Yêu cầu rút tiền</h3>
                    
                    {(!userProfile?.balance || userProfile.balance < 10000) ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>Số dư không đủ</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Bạn cần có ít nhất 10.000 đ trong số dư khả dụng để có thể rút tiền. Hãy chốt doanh thu các sự kiện đã kết thúc để cập nhật số dư nhé.</p>
                        <button type="button" onClick={() => setShowPayoutModal(false)} style={{ ...s.btn, background: '#e2e8f0', color: '#4a5568' }}>Đóng</button>
                      </div>
                    ) : (
                      <form onSubmit={submitPayout}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={s.label}>Số tiền rút (Tối đa {Number(userProfile?.balance || 0).toLocaleString('vi-VN')} đ)</label>
                          <input style={s.input} type="number" min="10000" max={userProfile?.balance || 0} required value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})} placeholder="Nhập số tiền" />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={s.label}>Tên ngân hàng</label>
                          <input style={s.input} required value={payoutForm.bankName} onChange={e => setPayoutForm({...payoutForm, bankName: e.target.value})} placeholder="VD: Vietcombank" />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={s.label}>Số tài khoản</label>
                          <input style={s.input} required value={payoutForm.bankAccountNumber} onChange={e => setPayoutForm({...payoutForm, bankAccountNumber: e.target.value})} placeholder="VD: 1029384756" />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={s.label}>Tên chủ tài khoản (In hoa không dấu)</label>
                          <input style={s.input} required value={payoutForm.bankAccountName} onChange={e => setPayoutForm({...payoutForm, bankAccountName: e.target.value})} placeholder="VD: NGUYEN VAN A" />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button type="submit" style={s.btn} disabled={payoutLoading}>{payoutLoading ? 'Đang gửi...' : 'Xác nhận rút tiền'}</button>
                          <button type="button" onClick={() => setShowPayoutModal(false)} style={{ ...s.btn, background: '#e2e8f0', color: '#4a5568' }}>Hủy</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sự kiện của tôi</h2>
                {!showCreateEvent && !managingEvent && (
                  <button onClick={() => { setShowCreateEvent(true); setManagingEvent(null); setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '' }); clearImageSelection(); }} style={{ ...s.btn, width: 'auto' }}>+ Tạo sự kiện mới</button>
                )}
              </div>

              {managingEvent ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Quản lý: {managingEvent.title}</h3>
                    <div>
                      {(managingEvent.status === 'DRAFT' || managingEvent.status === 'PENDING') && (
                        <>
                          <button onClick={() => publishEvent(managingEvent.id)} style={{ ...s.btn, background: '#10b981', width: 'auto', marginRight: 10 }}>Duyệt / Xuất bản</button>
                          <button onClick={() => deleteEvent(managingEvent.id)} style={{ ...s.btn, background: '#ef4444', width: 'auto', marginRight: 10 }}>Xóa Sự Kiện</button>
                        </>
                      )}
                      {managingEvent.status === 'PUBLISHED' && (
                        <button onClick={() => closeEvent(managingEvent.id)} style={{ ...s.btn, background: '#f59e0b', width: 'auto', marginRight: 10 }}>Đóng Sự Kiện</button>
                      )}
                      <button onClick={() => { setManagingEvent(null); loadAgencyData(); }} style={{ ...s.btn, background: '#e2e8f0', color: '#4a5568', width: 'auto' }}>Trở về</button>
                    </div>
                  </div>
                  {renderEventForm()}
                  {renderTicketManagement()}
                </div>
              ) : showCreateEvent ? renderEventForm() : (
                events.length === 0 ? (
                  <div style={{ ...s.card, textAlign: 'center', padding: '3rem 2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Chưa có sự kiện nào</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Hãy bắt đầu bằng cách tạo sự kiện đầu tiên của bạn.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    {events.map(ev => (
                      <div key={ev.id} style={{ ...s.card, padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 5 }}>{ev.title}</h4>
                          <p style={{ fontSize: '0.85rem', color: '#4a5568' }}>Trạng thái: 
                            <span style={s.badge(
                              ev.status === 'PUBLISHED' ? 'rgba(0,180,110,0.1)' : ev.status === 'DRAFT' ? 'rgba(59,130,246,0.1)' : ev.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                              ev.status === 'PUBLISHED' ? '#00B46E' : ev.status === 'DRAFT' ? '#3b82f6' : ev.status === 'PENDING' ? '#f59e0b' : '#ef4444'
                            )}>{ev.status}</span>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => handleManageEvent(ev)} style={{ padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                            Quản lý
                          </button>
                          {(ev.status === 'CLOSED' || ev.status === 'PUBLISHED') && (
                            <button onClick={() => settleEvent(ev.id)} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                              Chốt Doanh Thu
                            </button>
                          )}
                          <Link href={`/events/${ev.id}`} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#0f172a', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            Xem trang
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Danh sách Người mua vé</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Tổng cộng: <strong>{customers.length}</strong> khách hàng đã mua vé.
                </div>
                
                {/* Export CSV for each event */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>Xuất danh sách theo sự kiện:</label>
                  <select 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const selectedEv = events.find(ev => ev.id.toString() === val);
                      if (selectedEv) handleExportCsv(selectedEv.id, selectedEv.title);
                      e.target.value = ''; // reset selection
                    }} 
                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="">-- Chọn sự kiện để xuất CSV --</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {customers.length === 0 ? (
                <div style={{ ...s.card, textAlign: 'center', padding: '3rem 2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Chưa có người mua vé</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Dữ liệu sẽ hiển thị tại đây khi có người thanh toán vé thành công.</p>
                </div>
              ) : (
                <div style={{ ...s.card, padding: '1rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', background: '#f8fafc' }}>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Họ tên</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Email</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Số điện thoại</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Sự kiện</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Vé</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Ghế</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Check-in</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Ngày mua</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', hover: { background: '#f8fafc' } }}>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{c.customerName}</td>
                          <td style={{ padding: '12px 10px' }}>{c.customerEmail}</td>
                          <td style={{ padding: '12px 10px' }}>{c.customerPhone || 'Không có'}</td>
                          <td style={{ padding: '12px 10px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.eventTitle}>{c.eventTitle}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0f172a' }}>{c.ticketTypeName}</td>
                          <td style={{ padding: '12px 10px' }}><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{c.seatNumber}</span></td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={s.badge(
                              c.checkinStatus === 'USED' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                              c.checkinStatus === 'USED' ? '#10b981' : '#64748b'
                            )}>{c.checkinStatus}</span>
                          </td>
                          <td style={{ padding: '12px 10px', color: '#64748b' }}>
                            {c.purchaseDate ? new Date(c.purchaseDate).toLocaleDateString('vi-VN') : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
