'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { API_BASE, apiRequest, isLoggedIn, setUser } from '@/lib/api';

const getDatesBetween = (startStr, endStr) => {
  const dates = [];
  if (!startStr || !endStr) return dates;
  let current = new Date(startStr);
  const end = new Date(endStr);
  current.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export default function AgencyDashboard() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeFilter, setTimeFilter] = useState('28days');
  const [showFullReport, setShowFullReport] = useState(false);
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ organizationName: '', contactPhone: '', contactEmail: '' });
  const [regLoading, setRegLoading] = useState(false);

  // Agency Stats & Data
  const [events, setEvents] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  

  // Event Creation
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', location: '', startTime: '', endTime: '', surveyUrl: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Event Management (Edit/Tickets)
  const [managingEvent, setManagingEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true });

  // Seat Management
  const [seatManagerTicket, setSeatManagerTicket] = useState(null);
  const [seatConfig, setSeatConfig] = useState({ rows: 10, cols: 10 });
  const [seatsList, setSeatsList] = useState([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [warningAction, setWarningAction] = useState(null);

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
      const res = await fetch(`${API_BASE}/events/${eventId}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!data.success) { alert(data.message); }
    } catch (e) { alert('Lỗi upload ảnh'); }
  };

  const proceedSubmitEvent = async () => {
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
            await fetch(`${API_BASE}/events/${eventId}/upload-image`, {
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
        setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '', surveyUrl: '' });
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

  const submitEvent = async (e) => {
    e.preventDefault();
    setWarningAction(() => () => proceedSubmitEvent());
    setShowPublishWarning(true);
  };

  // --- Event Management Functions ---
  const handleManageEvent = async (ev) => {
    setManagingEvent(ev);
    setShowCreateEvent(false);
    setShowTicketForm(false);
    setSeatManagerTicket(null);
    setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true });
    clearImageSelection();
    if (ev.imageUrl) setImagePreview(`${API_BASE.replace('/api', '')}${ev.imageUrl}`);
    setEventForm({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      startTime: ev.startTime ? ev.startTime.substring(0, 16) : '',
      endTime: ev.endTime ? ev.endTime.substring(0, 16) : '',
      surveyUrl: ev.surveyUrl || ''
    });
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

  const proceedUpdateEvent = async () => {
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
            await fetch(`${API_BASE}/events/${eventForm.id}/upload-image`, {
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

  const updateEvent = async (e) => {
    e.preventDefault();
    setWarningAction(() => () => proceedUpdateEvent());
    setShowPublishWarning(true);
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

  const updateFeaturedTag = async (eventId, tag) => {
    try {
      const res = await apiRequest(`/events/my-events/${eventId}/featured`, {
        method: 'POST',
        body: JSON.stringify({
          featuredTag: tag || null,
          isFeatured: !!tag
        })
      });
      if (res.success) {
        alert('Đã cập nhật nhãn nổi bật.');
        setManagingEvent(prev => prev?.id === eventId ? { ...prev, featuredTag: tag || null, isFeatured: !!tag } : prev);
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
      
      if (!isUpdate && ticketForm.applyToAllDays && managingEvent.startTime && managingEvent.endTime) {
        const dates = getDatesBetween(managingEvent.startTime, managingEvent.endTime);
        if (dates.length === 0) dates.push(null);
        
        for (const date of dates) {
          const payload = {
            name: ticketForm.name,
            price: Number(ticketForm.price),
            totalQuantity: Number(ticketForm.totalQuantity),
            eventDate: date
          };
          const url = `/events/my-events/${managingEvent.id}/ticket-types`;
          const res = await apiRequest(url, { method: 'POST', body: JSON.stringify(payload) });
          if (!res.success) {
            alert('Có lỗi khi tạo vé cho ngày ' + date + ': ' + res.message);
          }
        }
        alert(`Đã thêm vé cho ${dates.length} ngày!`);
      } else {
        const url = isUpdate ? `/events/my-events/ticket-types/${ticketForm.id}` : `/events/my-events/${managingEvent.id}/ticket-types`;
        const method = isUpdate ? 'PUT' : 'POST';
        const payload = {
          name: ticketForm.name,
          price: Number(ticketForm.price),
          totalQuantity: Number(ticketForm.totalQuantity),
          eventDate: ticketForm.eventDate || null
        };

        const res = await apiRequest(url, { method, body: JSON.stringify(payload) });
        if (res.success) {
          alert(isUpdate ? 'Đã cập nhật vé!' : 'Đã thêm vé!');
        } else {
          alert(res.message);
          return;
        }
      }

      setShowTicketForm(false);
      setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true });
      loadTicketTypes(managingEvent.id);
      loadAgencyData();
    } catch (err) {
      alert('Lỗi kết nối');
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
    setSeatsList([]);
    setSeatLoading(true);
    try {
      const res = await apiRequest(`/events/my-events/ticket-types/${tt.id}/seats/count`);
      if (res.success) {
        setSeatManagerTicket({ id: tt.id, name: tt.name, seatCount: res.data.seatCount });
      }
      const seatsRes = await apiRequest(`/seats?ticketTypeId=${tt.id}`);
      if (seatsRes.success) {
        setSeatsList(seatsRes.data || []);
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
        
        // Tải lại danh sách ghế mới tạo
        const seatsRes = await apiRequest(`/seats?ticketTypeId=${seatManagerTicket.id}`);
        if (seatsRes.success) {
          setSeatsList(seatsRes.data || []);
        }
      } else { alert(res.message); }
    } catch (e) { alert('Lỗi tạo ghế'); }
    finally { setSeatLoading(false); }
  };

  const handleExportCsv = async (eventId, title) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/organizers/events/${eventId}/export-csv`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Khach_hang_${title.replace(/\s+/g, '_')}.csv`;
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
      <div style={{ ...s.card, maxWidth: '780px', margin: '0 auto 2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontWeight: 800, marginBottom: '0.25rem', fontSize: '1.3rem', color: '#0f172a' }}>{isEdit ? 'Chỉnh sửa thông tin sự kiện' : 'Tạo sự kiện mới'}</h4>
        <p style={{ margin: '0 0 2rem 0', fontSize: '0.85rem', color: '#64748b' }}>Đại lý vui lòng cung cấp thông tin sự kiện chi tiết để gửi duyệt đăng tải</p>
        
        <form onSubmit={isEdit ? updateEvent : submitEvent}>
          {/* Section 1: Basic Info */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00B46E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00B46E' }}></span>
              Thông tin cơ bản
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={s.label}>Tên sự kiện</label>
              <input style={s.input} placeholder="VD: Liveshow Ca Nhạc Chào Tân Sinh Viên..." required value={eventForm.title} onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={s.label}>Mô tả chi tiết</label>
              <textarea style={{ ...s.input, resize: 'vertical', minHeight: '110px', lineHeight: '1.5' }} required rows={4} placeholder="Nhập mô tả sự kiện, quyền lợi của vé, lịch trình chi tiết..." value={eventForm.description} onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>

          {/* Section 2: Time & Location */}
          <div style={{ marginBottom: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00B46E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00B46E' }}></span>
              Thời gian & Địa điểm
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={s.label}>Địa điểm tổ chức</label>
              <input style={s.input} placeholder="VD: Sân vận động trường, Hội trường lớn..." required value={eventForm.location} onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={s.label}>Thời gian bắt đầu</label>
                <input style={s.input} type="datetime-local" required value={eventForm.startTime} onChange={e => setEventForm(prev => ({ ...prev, startTime: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Thời gian kết thúc</label>
                <input style={s.input} type="datetime-local" required value={eventForm.endTime} onChange={e => setEventForm(prev => ({ ...prev, endTime: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Section 3: Media & Survey */}
          <div style={{ marginBottom: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00B46E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00B46E' }}></span>
              Hình ảnh & Khảo sát
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={s.label}>Link Google Forms khảo sát ý kiến (tùy chọn)</label>
              <input style={s.input} type="url" placeholder="https://forms.gle/..." value={eventForm.surveyUrl} onChange={e => setEventForm(prev => ({ ...prev, surveyUrl: e.target.value }))} />
            </div>

            <div>
              <label style={s.label}>Hình ảnh Banner sự kiện</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                <label style={{ ...s.btn, background: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', cursor: 'pointer', padding: '10px 16px', width: 'auto', display: 'inline-block' }}>
                  {imagePreview ? 'Thay đổi ảnh' : 'Chọn tập tin ảnh'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
                </label>
                
                {imagePreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '120px', height: '75px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                    <button type="button" onClick={clearImageSelection} style={{ ...s.btn, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px 12px', width: 'auto' }}>Gỡ ảnh</button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Hỗ trợ định dạng JPG, PNG tối đa 5MB</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <button type="button" style={{ ...s.btn, width: 'auto', background: '#e2e8f0', color: '#4a5568', padding: '10px 24px' }} onClick={() => { setShowCreateEvent(false); setManagingEvent(null); }}>Hủy bỏ</button>
            <button type="submit" style={{ ...s.btn, width: 'auto', padding: '10px 30px' }} disabled={formLoading}>{formLoading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Tạo sự kiện')}</button>
          </div>
        </form>
      </div>
    );
  };

  const renderTicketManagement = () => (
    <div style={{ ...s.card, marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Quản lý Loại vé</h4>
        {!showTicketForm && <button onClick={() => { setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true }); setShowTicketForm(true); }} style={{ ...s.btn, width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}>+ Thêm vé</button>}
      </div>

      {showTicketForm && (
        <form onSubmit={submitTicket} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><label style={s.label}>Tên vé (VD: VIP)</label><input style={s.input} required value={ticketForm.name} onChange={e => setTicketForm({...ticketForm, name: e.target.value})} /></div>
            <div><label style={s.label}>Giá (VNĐ)</label><input style={s.input} type="number" min="0" required value={ticketForm.price} onChange={e => setTicketForm({...ticketForm, price: e.target.value})} /></div>
            <div><label style={s.label}>Số lượng (Tối đa)</label><input style={s.input} type="number" min="1" required value={ticketForm.totalQuantity} onChange={e => setTicketForm({...ticketForm, totalQuantity: e.target.value})} /></div>
            <div><label style={s.label}>Ngày áp dụng</label><input style={s.input} type="date" value={ticketForm.eventDate} onChange={e => setTicketForm({...ticketForm, eventDate: e.target.value})} disabled={ticketForm.applyToAllDays} /></div>
          </div>
          {!ticketForm.id && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="applyAll" checked={ticketForm.applyToAllDays} onChange={e => setTicketForm({...ticketForm, applyToAllDays: e.target.checked, eventDate: ''})} />
              <label htmlFor="applyAll" style={{ fontSize: '0.9rem', cursor: 'pointer', color: '#334155', fontWeight: 600 }}>Áp dụng tự động cho toàn bộ các ngày diễn ra sự kiện</label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ ...s.btn, width: 'auto' }}>Lưu vé</button>
            <button type="button" style={{ ...s.btn, width: 'auto', background: '#e2e8f0', color: '#4a5568' }} onClick={() => { setShowTicketForm(false); setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true }); }}>Hủy</button>
          </div>
        </form>
      )}

      {ticketTypes.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>Sự kiện chưa có vé nào.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px 0', color: '#4a5568' }}>Ngày</th>
              <th style={{ padding: '10px 0', color: '#4a5568' }}>Tên vé</th>
              <th style={{ padding: '10px 0', color: '#4a5568' }}>Giá</th>
              <th style={{ padding: '10px 0', color: '#4a5568' }}>Số lượng</th>
              <th style={{ padding: '10px 0', color: '#4a5568', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {ticketTypes.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 0', fontWeight: 600 }}>{t.eventDate ? new Date(t.eventDate).toLocaleDateString('vi-VN') : 'Mặc định'}</td>
                <td style={{ padding: '10px 0', fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: '10px 0', color: '#0ea5e9', fontWeight: 600 }}>{Number(t.price).toLocaleString('vi-VN')} đ</td>
                <td style={{ padding: '10px 0' }}>{t.totalQuantity} (Còn {t.availableQuantity})</td>
                <td style={{ padding: '10px 0', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => openSeatManager(t)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Tạo ghế</button>
                  <button type="button" onClick={() => { setSeatManagerTicket(null); setTicketForm({ id: t.id, name: t.name, price: t.price, totalQuantity: t.totalQuantity, eventDate: t.eventDate || '' }); setShowTicketForm(true); }} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Sửa</button>
                  <button type="button" onClick={() => deleteTicketType(t.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Xóa</button>
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

          {/* Visual Seat Map */}
          {seatsList && seatsList.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <h6 style={{ fontWeight: 700, margin: 0, color: '#1e293b', fontSize: '0.9rem' }}>Sơ đồ ghế hiện tại</h6>
                <div style={{ display: 'flex', gap: '15px', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }}></div>
                    <span>Trống ({seatsList.filter(s => s.status === 'AVAILABLE').length})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }}></div>
                    <span>Đã đặt ({seatsList.filter(s => s.status === 'BOOKED').length})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }}></div>
                    <span>Đang giữ ({seatsList.filter(s => s.status === 'LOCKED').length})</span>
                  </div>
                </div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `repeat(auto-fill, minmax(42px, 1fr))`, 
                  gap: '6px', 
                  width: '100%',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {seatsList.map(st => {
                    let bg = '#10b981'; // AVAILABLE
                    if (st.status === 'BOOKED') bg = '#ef4444';
                    else if (st.status === 'LOCKED') bg = '#f59e0b';
                    return (
                      <div 
                        key={st.id}
                        style={{ 
                          height: '26px', 
                          background: bg, 
                          color: '#fff', 
                          borderRadius: '4px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '0.7rem', 
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          transition: 'transform 0.15s ease'
                        }}
                        title={`Ghế: ${st.name} - Trạng thái: ${st.status}`}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {st.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const s = {
    page: { display: 'flex', minHeight: 'calc(100vh - 60px)', paddingTop: 64, background: '#f8fafc', color: '#1a1a2e' },
    sidebar: { width: 240, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' },
    sidebarTitle: { padding: '1.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#1a1a2e', borderBottom: '1px solid #f0f0f5' },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: active ? 600 : 400, color: active ? '#00B46E' : '#4a5568', background: active ? 'rgba(0,180,110,0.06)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: active ? '3px solid #00B46E' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left', fontFamily: 'inherit' }),
    main: { flex: 1, padding: '2rem', maxWidth: 1360, width: '100%', margin: '0 auto' },
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
                    <p style={{ marginBottom: '1.5rem', color: '#4a5568', fontSize: '0.9rem' }}>Trở thành đại lý để tạo sự kiện, quản lý vé, check-in khách tham dự và gửi khảo sát sau sự kiện.</p>
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

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

  const getEventPerformanceRows = () => {
    const performanceByEvent = customers.reduce((acc, customer) => {
      const key = String(customer.eventId || customer.eventTitle || '');
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = { ticketsSold: 0, revenue: 0, checkedIn: 0 };
      }
      acc[key].ticketsSold += 1;
      acc[key].revenue += Number(customer.ticketPrice || 0);
      if (customer.checkinStatus === 'USED') {
        acc[key].checkedIn += 1;
      }
      return acc;
    }, {});

    return events.map((event) => {
      const metrics = performanceByEvent[String(event.id)] || performanceByEvent[event.title] || { ticketsSold: 0, revenue: 0, checkedIn: 0 };
      return {
        ...event,
        ticketsSold: metrics.ticketsSold,
        revenue: metrics.revenue,
        checkedIn: metrics.checkedIn,
      };
    });
  };

  const renderDailySalesChart = () => {
    if (!dashboardStats) return null;

    const salesData = Array.isArray(dashboardStats.salesByDate) ? dashboardStats.salesByDate : [];
    const revenueData = salesData
      .map((item) => ({
        name: item.date || 'Chưa rõ ngày',
        value: Number(item.revenue || 0)
      }))
      .filter((item) => item.value > 0);
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);

    const soldTickets = Number(dashboardStats.totalTicketsSold || 0);
    const checkedInTickets = Number(dashboardStats.checkedInTickets || 0);
    const totalCapacity = Number(dashboardStats.totalCapacity || 0);
    const funnelData = [
      { name: 'Đã check-in', value: Math.max(checkedInTickets, 0) },
      { name: 'Đã mua chưa đến', value: Math.max(soldTickets - checkedInTickets, 0) },
      { name: 'Sức chứa còn lại', value: Math.max(totalCapacity - soldTickets, 0) }
    ].filter((item) => item.value > 0);
    const funnelTotal = funnelData.reduce((sum, item) => sum + item.value, 0);

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

    const renderDonut = ({ title, subtitle, segments, total, centerValue, centerLabel, emptyText, valueFormatter, formatName = (name) => name }) => (
      <div style={{ ...s.card, margin: 0, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>{title}</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.88rem' }}>{subtitle}</p>
          </div>
          <span style={{ background: total > 0 ? '#ecfdf5' : '#f1f5f9', color: total > 0 ? '#047857' : '#64748b', padding: '7px 11px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800 }}>
            {total > 0 ? 'Có dữ liệu' : 'Chưa có dữ liệu'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: '210px', height: '210px', margin: '0 auto' }}>
            <svg width="210" height="210" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
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
            <div style={{ position: 'absolute', inset: '42px', borderRadius: '50%', background: '#fff', display: 'grid', placeContent: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #eef2f7' }}>
              <strong style={{ color: '#0f172a', fontSize: centerValue.length > 10 ? '1rem' : '1.3rem' }}>{centerValue}</strong>
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
                  <span style={{ color: '#334155', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatName(segment.name)}</span>
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
          valueFormatter: formatMoney,
          formatName: formatChartDate
        })}
        {renderDonut({
          title: 'Hiệu suất tham dự',
          subtitle: 'Tỷ trọng check-in, vé đã mua và sức chứa còn lại',
          segments: buildSegments(funnelData, funnelTotal),
          total: funnelTotal,
          centerValue: String(funnelTotal),
          centerLabel: 'Tổng suất',
          emptyText: 'Chưa có dữ liệu sức chứa hoặc check-in.',
          valueFormatter: (value) => value + ' suất'
        })}
      </div>
    );
  };

  const handleExportReport = () => {
    if (!dashboardStats) return;
    const csvContent = [
      ["Tieu chi", "Gia tri"],
      ["Tong so luot xem", dashboardStats.totalViews || 0],
      ["Tong so ve ban ra", dashboardStats.ticketsSold || 0],
      ["Tong so ve da check-in", dashboardStats.checkedInTickets || 0],
      ["Tong so ve chua check-in", dashboardStats.unusedTickets || 0],
      ["Ti le tham gia (%)", dashboardStats.attendanceRate ? dashboardStats.attendanceRate.toFixed(2) : "0.00"],
      ["Tong doanh thu (VND)", dashboardStats.totalRevenue || 0],
      ["Tong so su kien", dashboardStats.totalEvents || 0],
      ["Su kien dang ban ve", dashboardStats.publishedEvents || 0],
      ["Su kien cho duyet", dashboardStats.pendingEvents || 0]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_Dai_ly_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Navbar />
      <div style={s.page}>
        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Kênh Đại Lý</div>
          <button onClick={() => setActiveTab('dashboard')} style={s.navItem(activeTab === 'dashboard')}>Tổng quan</button>
          <button onClick={() => setActiveTab('revenue')} style={s.navItem(activeTab === 'revenue')}>Doanh thu & Báo cáo</button>
          <button onClick={() => setActiveTab('events')} style={s.navItem(activeTab === 'events')}>Quản lý Sự kiện</button>
          <button onClick={() => setActiveTab('customers')} style={s.navItem(activeTab === 'customers')}>Danh sách Khách hàng</button>
          <Link href="/admin/checkin" style={{ display: 'block', padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: 600, color: '#fff', background: '#00B46E', borderRadius: 8, margin: '1rem', textDecoration: 'none', textAlign: 'center' }}>
            Quét QR Check-in
          </Link>
        </aside>
        <main style={s.main}>
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Tổng quan Kênh đại lý</h2>
              
              {/* SaaS Premium Control Filter Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <span>Kênh Đại lý của tôi</span>
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

                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Bộ lọc kích hoạt</span>
                  </div>

                  <button style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ＋ Thêm bộ lọc
                  </button>
                </div>

                <button 
                  onClick={handleExportReport}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '2px' }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Xuất báo cáo
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #8b5cf6', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doanh thu đại lý</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: 8 }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardStats?.totalRevenue || 0)}
                  </div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #10b981', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vé đã bán</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: 8 }}>
                    {dashboardStats?.ticketsSold || 0} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>/ {dashboardStats?.totalCapacity || 0} vé</span>
                  </div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #f59e0b', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đã check-in</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: 8 }}>{dashboardStats?.checkedInTickets || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #00B46E', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tỷ lệ tham dự</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00B46E', marginTop: 8 }}>{Math.round(dashboardStats?.attendanceRate || 0)}%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #0f172a', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng sự kiện</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{dashboardStats?.totalEvents || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #f59e0b', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chờ admin duyệt</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: 8 }}>{dashboardStats?.pendingEvents || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #10b981', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đang bán vé</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: 8 }}>{dashboardStats?.publishedEvents || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #64748b', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đã đóng</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#64748b', marginTop: 8 }}>{dashboardStats?.closedEvents || 0}</div>
                </div>
              </div>

              {renderDailySalesChart()}
            </div>
          )}
          {activeTab === 'events' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sự kiện của tôi</h2>
                {!showCreateEvent && !managingEvent && (
                  <button onClick={() => { setShowCreateEvent(true); setManagingEvent(null); setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '', surveyUrl: '' }); clearImageSelection(); }} style={{ ...s.btn, width: 'auto' }}>+ Tạo sự kiện mới</button>
                )}
              </div>

              {managingEvent ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Quản lý: {managingEvent.title}</h3>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={managingEvent.featuredTag || ''}
                        onChange={(e) => updateFeaturedTag(managingEvent.id, e.target.value)}
                        style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, background: '#fff' }}
                      >
                        <option value="">Không nổi bật</option>
                        <option value="HOT">HOT</option>
                        <option value="TRENDING">TRENDING</option>
                        <option value="SPONSORED">SPONSORED</option>
                      </select>
                      {(
                        <>
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
                          <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 5 }}>
                            {ev.title}
                            {ev.featuredTag && <span style={s.badge('#fee2e2', '#b91c1c')}>{ev.featuredTag}</span>}
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#4a5568' }}>Trạng thái: 
                            <span style={s.badge(
                              ev.status === 'PUBLISHED' ? 'rgba(0,180,110,0.1)' : ev.status === 'DRAFT' ? 'rgba(59,130,246,0.1)' : ev.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                              ev.status === 'PUBLISHED' ? '#00B46E' : ev.status === 'DRAFT' ? '#3b82f6' : ev.status === 'PENDING' ? '#f59e0b' : '#ef4444'
                            )}>{ev.status}</span>
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={ev.featuredTag || ''}
                            onChange={(e) => updateFeaturedTag(ev.id, e.target.value)}
                            style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, background: '#fff' }}
                          >
                            <option value="">Không nổi bật</option>
                            <option value="HOT">HOT</option>
                            <option value="TRENDING">TRENDING</option>
                            <option value="SPONSORED">SPONSORED</option>
                          </select>
                          <button onClick={() => handleManageEvent(ev)} style={{ padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                            Quản lý
                          </button>
                          {ev.status === 'CLOSED' && (
                            <span style={{ padding: '8px 12px', background: ev.postEventEmailSentAt ? '#dcfce7' : '#f1f5f9', color: ev.postEventEmailSentAt ? '#166534' : '#64748b', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                              {ev.postEventEmailSentAt ? 'Đã gửi email cảm ơn' : 'Đã đóng sự kiện'}
                            </span>
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

          {activeTab === 'revenue' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Doanh thu & Báo cáo</h2>
                  <p style={{ color: '#64748b', margin: 0 }}>Theo dõi doanh thu, vé bán, tỷ lệ check-in và xuất báo cáo cho kênh đại lý.</p>
                </div>
                <button onClick={handleExportReport} style={{ ...s.btn, width: 'auto', padding: '10px 18px' }}>Xuất báo cáo CSV</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #8b5cf6', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng doanh thu</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: 8 }}>{formatMoney(dashboardStats?.totalRevenue || 0)}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #10b981', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Vé đã bán</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: 8 }}>{dashboardStats?.ticketsSold || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #f59e0b', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Đã check-in</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: 8 }}>{dashboardStats?.checkedInTickets || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #3b82f6', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tỷ lệ tham dự</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', marginTop: 8 }}>{Math.round(dashboardStats?.attendanceRate || 0)}%</div>
                </div>
              </div>

              {renderDailySalesChart()}

              <div style={{ ...s.card, marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Bảng hiệu suất sự kiện</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 0', color: '#4a5568' }}>Sự kiện</th>
                        <th style={{ padding: '10px 0', color: '#4a5568', textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ padding: '10px 0', color: '#4a5568', textAlign: 'center' }}>Vé đã bán</th>
                        <th style={{ padding: '10px 0', color: '#4a5568', textAlign: 'right' }}>Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getEventPerformanceRows().map(ev => (
                        <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 0', fontWeight: 700 }}>{ev.title}</td>
                          <td style={{ padding: '12px 0', textAlign: 'center' }}><span style={s.badge('#eef2ff', '#4338ca')}>{ev.status}</span></td>
                          <td style={{ padding: '12px 0', textAlign: 'center', fontWeight: 700 }}>{ev.ticketsSold || 0}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 800, color: '#8b5cf6' }}>{formatMoney(ev.revenue || 0)}</td>
                        </tr>
                      ))}
                      {events.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '16px 0', textAlign: 'center', color: '#64748b' }}>Chưa có sự kiện để báo cáo.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
          {/* Warning Modal */}
          {showPublishWarning && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)',
              padding: '20px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '650px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                padding: '2.5rem',
                fontFamily: 'inherit'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#1e293b',
                  marginBottom: '1.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                  borderBottom: '2px solid #f1f5f9',
                  paddingBottom: '0.75rem'
                }}>
                  LƯU Ý KHI ĐĂNG TẢI SỰ KIỆN
                </h3>
                <div style={{
                  fontSize: '0.92rem',
                  color: '#334155',
                  lineHeight: '1.7',
                  textAlign: 'justify',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <p style={{ margin: 0 }}>
                    1. Vui lòng <strong>không hiển thị thông tin liên lạc cá nhân của Ban Tổ Chức</strong> (ví dụ: Số điện thoại/ Email/ Facebook/ Instagram...) <strong>trên banner và trong nội dung chi tiết bài đăng</strong>. Đại lý chỉ sử dụng hotline hỗ trợ hoặc kênh liên hệ chính thức của hệ thống <strong>Trivent</strong> để giao dịch vé.
                  </p>
                  <p style={{ margin: 0 }}>
                    2. Trong trường hợp Ban tổ chức <strong>tạo mới hoặc cập nhật sự kiện không tuân thủ quy định nêu trên, Ban quản trị hệ thống Trivent có quyền từ chối phê duyệt sự kiện</strong>.
                  </p>
                  <p style={{ margin: 0 }}>
                    3. Hệ thống <strong>Trivent</strong> sẽ liên tục kiểm duyệt thông tin các sự kiện hiển thị trên nền tảng. <strong>Nếu phát hiện sai phạm liên quan đến hình ảnh/ nội dung đăng tải, ban quản lý có quyền gỡ bỏ hoặc tạm ngưng dịch vụ đối với sự kiện vi phạm</strong>.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      setShowPublishWarning(false);
                      if (warningAction) warningAction();
                    }}
                    style={{
                      padding: '10px 48px',
                      background: '#00B46E',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(0, 180, 110, 0.2)'
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Báo cáo phân tích chi tiết Đại lý</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Bảng số liệu thống kê hoạt động & doanh thu theo ngày của đại lý</span>
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
                    const salesData = dashboardStats?.salesByDate || [];
                    const hasSalesData = salesData.length > 0;
                    const lineChartData = hasSalesData ? salesData : [
                      { date: '2026-06-22', ticketsSold: 2, ordersCount: 1, revenue: 300000 },
                      { date: '2026-06-23', ticketsSold: 5, ordersCount: 2, revenue: 750000 },
                      { date: '2026-06-24', ticketsSold: 8, ordersCount: 4, revenue: 1200000 },
                      { date: '2026-06-25', ticketsSold: 4, ordersCount: 2, revenue: 600000 },
                      { date: '2026-06-26', ticketsSold: 12, ordersCount: 5, revenue: 1800000 },
                      { date: '2026-06-27', ticketsSold: 9, ordersCount: 4, revenue: 1350000 },
                      { date: '2026-06-28', ticketsSold: 15, ordersCount: 6, revenue: 2250000 },
                    ];
                    return lineChartData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', height: '40px' }}>
                        <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 600 }}>{row.date}</td>
                        <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>{row.ticketsSold} vé</td>
                        <td style={{ padding: '10px 12px', color: '#3b82f6', fontWeight: 700, textAlign: 'center' }}>{row.ordersCount || 0}</td>
                        <td style={{ padding: '10px 12px', color: '#8b5cf6', fontWeight: 700, textAlign: 'right' }}>
                          {Number(row.revenue || 0).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleExportReport}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
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
