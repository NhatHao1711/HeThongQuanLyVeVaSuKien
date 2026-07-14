'use client';
import { showPopup } from '@/components/GlobalPopup';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { API_BASE, apiRequest, isLoggedIn, setUser } from '@/lib/api';

const parseDateSafe = (dateVal) => {
  if (!dateVal) return null;
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, d, h, min, s);
  }
  return new Date(dateVal);
};

const formatDateTimeLocalSafe = (dateVal) => {
  const d = parseDateSafe(dateVal);
  if (!d || isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getDatesBetween = (startStr, endStr) => {
  const dates = [];
  if (!startStr || !endStr) return dates;
  let current = parseDateSafe(startStr);
  const end = parseDateSafe(endStr);
  
  if (!current || isNaN(current) || !end || isNaN(end)) return dates;
  
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
  const [expandedTicketGroups, setExpandedTicketGroups] = useState({});
  

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
  const [seatsList, setSeatsList] = useState([]);

  // Seat Management
  const [seatManagerTicket, setSeatManagerTicket] = useState(null);
  const [seatConfig, setSeatConfig] = useState({ rows: 10, cols: 10 });
  const [applySeatToAll, setApplySeatToAll] = useState(true);
  const [seatLoading, setSeatLoading] = useState(false);
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [warningAction, setWarningAction] = useState(null);

  // Review Management State
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilterEvent, setReviewFilterEvent] = useState('all');
  const [reviewFilterRating, setReviewFilterRating] = useState('all');


  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
        setEvents((eRes.data || []).filter(event => event.status !== 'CANCELLED'));
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

  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    bankName: 'Vietcombank',
    bankAccountName: '',
    bankAccountNumber: ''
  });

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    if (!payoutForm.amount) return;
    try {
      const res = await apiRequest('/payouts/request', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(payoutForm.amount),
          bankName: payoutForm.bankName,
          bankAccountName: payoutForm.bankAccountName,
          bankAccountNumber: payoutForm.bankAccountNumber
        })
      });
      if (res.success) {
        showPopup('Yêu cầu rút tiền thành công! Vui lòng kiểm tra email của bạn.');
        setPayoutForm({ ...payoutForm, amount: '' });
        loadProfile(); // Refresh balance
      } else {
        showPopup(res.message || 'Lỗi rút tiền');
      }
    } catch (err) {
      showPopup('Lỗi kết nối máy chủ');
    }
  };

  const loadManageReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await apiRequest('/reviews/manage');
      if (res && res.data) {
        setReviews(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi tải danh sách đánh giá', 'error');
    } finally {
      setReviewsLoading(false);
    }
  };

  const toggleReviewHide = async (reviewId) => {
    try {
      const res = await apiRequest(`/reviews/${reviewId}/toggle-hide`, {
        method: 'PUT'
      });
      if (res.success) {
        showToast(res.message || 'Thao tác thành công', 'success');
        loadManageReviews();
      } else {
        showToast(res.message || 'Có lỗi xảy ra', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi kết nối máy chủ', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadManageReviews();
    }
  }, [activeTab]);
  const submitRegistration = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      const res = await apiRequest('/organizers/requests', {
        method: 'POST',
        body: JSON.stringify(regForm)
      });
      if (res.success) {
        showPopup('Gửi yêu cầu thành công! Vui lòng chờ admin phê duyệt.');
        loadProfile(); // Reload profile to update agencyStatus
      } else {
        showPopup(res.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      showPopup('Lỗi kết nối');
    } finally {
      setRegLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { showPopup('File quá lớn (Tối đa 5MB)'); return; }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const getMinDateTimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const validateEventSchedule = (allowExistingPastStart = false) => {
    if (!eventForm.startTime || !eventForm.endTime) return true;

    const start = new Date(eventForm.startTime);
    const end = new Date(eventForm.endTime);

    if (!allowExistingPastStart && start < new Date()) {
      showToast('Thời gian bắt đầu phải nằm trong tương lai.', 'error');
      return false;
    }

    if (end <= start) {
      showToast('Thời gian kết thúc phải sau thời gian bắt đầu.', 'error');
      return false;
    }

    return true;
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
      if (!data.success) { showToast(data.message, 'error'); }
    } catch (e) { showToast('Lỗi upload ảnh', 'error'); }
  };

  const proceedSubmitEvent = async () => {
    if (!validateEventSchedule()) return;
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
        showPopup('Tạo sự kiện thành công! Chờ duyệt.');
        setShowCreateEvent(false);
        setEventForm({ title: '', description: '', location: '', startTime: '', endTime: '', surveyUrl: '' });
        clearImageSelection();
        loadAgencyData();
      } else {
        showPopup(res.message);
      }
    } catch (err) {
      showPopup('Lỗi kết nối');
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
      startTime: formatDateTimeLocalSafe(ev.startTime),
      endTime: formatDateTimeLocalSafe(ev.endTime),
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
    if (!validateEventSchedule(true)) return;
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
        showPopup('Cập nhật sự kiện thành công!');
        // Update local state without closing manager
        setManagingEvent(prev => ({...prev, ...payload}));
        clearImageSelection();
        loadAgencyData();
      } else {
        showPopup(res.message);
      }
    } catch (err) {
      showPopup('Lỗi kết nối');
    } finally {
      setFormLoading(false);
    }
  };

  const updateEvent = async (e) => {
    e.preventDefault();
    await proceedUpdateEvent();
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.')) return;
    try {
      const res = await apiRequest(`/events/my-events/${eventId}`, { method: 'DELETE' });
      if (res.success) {
        showPopup('Đã xóa sự kiện.');
        setEvents(prev => prev.filter(event => event.id !== eventId));
        setManagingEvent(null);
        loadAgencyData();
      } else {
        showPopup(res.message);
      }
    } catch (err) {
      showPopup('Lỗi kết nối');
    }
  };

  const closeEvent = async (eventId) => {
    if (!confirm('Bạn có chắc chắn muốn đóng sự kiện này? Khán giả sẽ không thể mua vé nữa.')) return;
    try {
      const res = await apiRequest(`/events/my-events/${eventId}/close`, { method: 'POST' });
      if (res.success) {
        showPopup('Đã đóng sự kiện.');
        setManagingEvent(prev => ({ ...prev, status: 'CLOSED' }));
        loadAgencyData();
      } else {
        showPopup(res.message);
      }
    } catch (err) {
      showPopup('Lỗi kết nối');
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
        showPopup('Đã cập nhật nhãn nổi bật.');
        setManagingEvent(prev => prev?.id === eventId ? { ...prev, featuredTag: tag || null, isFeatured: !!tag } : prev);
        loadAgencyData();
      } else {
        showPopup(res.message);
      }
    } catch (err) {
      showPopup('Lỗi kết nối');
    }
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    try {
      const isUpdate = !!ticketForm.id;
      let createdTicket = null;
      
      console.log('DEBUG submitTicket:', {
        isUpdate,
        applyToAllDays: ticketForm.applyToAllDays,
        startTime: managingEvent.startTime,
        endTime: managingEvent.endTime
      });
      
      if (!isUpdate && ticketForm.applyToAllDays && managingEvent.startTime && managingEvent.endTime) {
        const dates = getDatesBetween(managingEvent.startTime, managingEvent.endTime);
        console.log('DEBUG dates:', dates);
        if (dates.length === 0) dates.push(null);
        
        let successCount = 0;
        let failCount = 0;
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
            failCount++;
            setToast({ message: 'Có lỗi khi tạo vé cho ngày ' + date + ': ' + res.message, type: 'error' });
          } else {
            successCount++;
            if (!createdTicket) createdTicket = res.data;
          }
        }
        setToast({ message: `Đã tạo ${successCount} vé (Lỗi: ${failCount}).`, type: 'success' });
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
          setToast({ message: isUpdate ? 'Đã cập nhật vé (Chỉ sửa 1 ngày)!' : 'Đã thêm vé (1 ngày)!', type: 'success' });
          if (!isUpdate) createdTicket = res.data;
        } else {
          setToast({ message: res.message, type: 'error' });
          return;
        }
      }

      setShowTicketForm(false);
      setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true });
      loadTicketTypes(managingEvent.id);
      loadAgencyData();
      if (createdTicket) openSeatManager(createdTicket);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Lỗi kết nối', type: 'error' });
    }
  };

  const deleteTicketType = async (ticketId) => {
    if (!confirm('Xóa loại vé này?')) return;
    try {
      const res = await apiRequest(`/events/my-events/ticket-types/${ticketId}`, { method: 'DELETE' });
      if (res.success) {
        showPopup('Đã xóa loại vé.');
        loadTicketTypes(managingEvent.id);
      } else {
        showPopup(res.message);
      }
    } catch (err) {
      showPopup('Lỗi kết nối');
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
    } catch (e) { showPopup('Lỗi tải thông tin ghế'); }
    finally { setSeatLoading(false); }
  };

  const generateSeats = async () => {
    setSeatLoading(true);
    try {
      let matchingTickets = [seatManagerTicket];
      if (applySeatToAll) {
         if (managingEvent && ticketTypes) {
           matchingTickets = ticketTypes.filter(t => t.name === seatManagerTicket.name);
         }
      }
      
      let sCount = 0;
      let fCount = 0;
      for (const tt of matchingTickets) {
        const res = await apiRequest(`/events/my-events/ticket-types/${tt.id}/seats/generate`, {
          method: 'POST',
          body: JSON.stringify({ rows: Number(seatConfig.rows), cols: Number(seatConfig.cols) })
        });
        if (res.success) sCount++; else fCount++;
      }
      
      showPopup(matchingTickets.length > 1 ? `Đã tạo sơ đồ cho ${sCount} loại vé (Lỗi: ${fCount})` : 'Đã tạo sơ đồ ghế');
      
      const seatsRes = await apiRequest(`/seats?ticketTypeId=${seatManagerTicket.id}`);
      if (seatsRes.success) {
        setSeatsList(seatsRes.data || []);
        setSeatManagerTicket(prev => ({ ...prev, seatCount: seatsRes.data.length }));
      }
    } catch (e) { showPopup('Lỗi tạo ghế'); }
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
        showPopup('Lỗi khi xuất file CSV');
      }
    } catch (e) {
      showPopup('Lỗi kết nối');
    }
  };

  const renderEventForm = () => {
    const isEdit = !!managingEvent;
    return (
      <div style={{ ...s.card, width: '100%', maxWidth: 'none', margin: '0 0 2.5rem', padding: 0, borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
          <h4 style={{ fontWeight: 800, marginBottom: '0.25rem', fontSize: '1.3rem', color: '#0f172a' }}>{isEdit ? 'Chỉnh sửa thông tin sự kiện' : 'Tạo sự kiện mới'}</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Đại lý vui lòng cung cấp thông tin sự kiện chi tiết để gửi duyệt đăng tải</p>
        </div>
        <div style={{ padding: '2rem' }}>
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
                <input style={s.input} type="datetime-local" required min={getMinDateTimeLocal()} value={eventForm.startTime} onChange={e => setEventForm(prev => ({ ...prev, startTime: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Thời gian kết thúc</label>
                <input style={s.input} type="datetime-local" required min={eventForm.startTime || getMinDateTimeLocal()} value={eventForm.endTime} onChange={e => setEventForm(prev => ({ ...prev, endTime: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Section 3: Media */}
          <div style={{ marginBottom: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00B46E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00B46E' }}></span>
              Hình ảnh Banner
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
      </div>
    );
  };

  const renderTicketManagement = () => (
    <div style={{ ...s.card, marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Chi tiết khán đài</h4>
        {!showTicketForm && <button onClick={() => { setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true }); setShowTicketForm(true); }} style={{ ...s.btn, width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}>+ Thêm khán đài</button>}
      </div>

      {showTicketForm && (
        <form onSubmit={submitTicket} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={s.label}>Tên khán đài</label>
              <input style={s.input} required placeholder="Khán đài A, Khán đài B..." value={ticketForm.name} onChange={e => setTicketForm({...ticketForm, name: e.target.value})} />
            </div>
            <div>
              <label style={s.label}>Giá (VNĐ)</label>
              <input style={s.input} type="number" min="0" required placeholder="VD: 50000" value={ticketForm.price} onChange={e => setTicketForm({...ticketForm, price: e.target.value})} />
            </div>
            <div>
              <label style={s.label}>Số lượng</label>
              <input style={s.input} type="number" min="1" required placeholder="VD: 100" value={ticketForm.totalQuantity} onChange={e => setTicketForm({...ticketForm, totalQuantity: e.target.value})} />
            </div>
            <div>
              <label style={s.label}>Ngày áp dụng</label>
              <input style={s.input} type="date" value={ticketForm.eventDate} onChange={e => setTicketForm({...ticketForm, eventDate: e.target.value})} disabled={ticketForm.applyToAllDays} />
            </div>
          </div>
          {!ticketForm.id && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="applyAll" checked={ticketForm.applyToAllDays} onChange={e => setTicketForm({...ticketForm, applyToAllDays: e.target.checked, eventDate: ''})} />
              <label htmlFor="applyAll" style={{ fontSize: '0.9rem', cursor: 'pointer', color: '#334155', fontWeight: 600 }}>Áp dụng tự động cho toàn bộ các ngày diễn ra sự kiện</label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ ...s.btn, width: 'auto' }}>Lưu</button>
            <button type="button" style={{ ...s.btn, width: 'auto', background: '#e2e8f0', color: '#4a5568' }} onClick={() => { setShowTicketForm(false); setTicketForm({ id: null, name: '', price: 0, totalQuantity: 0, eventDate: '', applyToAllDays: true }); }}>Hủy</button>
          </div>
        </form>
      )}

      {ticketTypes.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>Sự kiện chưa có khán đài nào.</p>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          {(() => {
            const groupTicketsByDate = (tickets) => {
              if (!tickets) return {};
              const grouped = {};
              tickets.forEach(tt => {
                let dateStr = 'Mặc định';
                if (tt.eventDate) {
                  const d = parseDateSafe(tt.eventDate);
                  if (d && !isNaN(d)) {
                    const pad = (n) => String(n).padStart(2, '0');
                    dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
                  }
                }
                if (!grouped[dateStr]) grouped[dateStr] = [];
                grouped[dateStr].push(tt);
              });
              return grouped;
            };
            const grouped = groupTicketsByDate(ticketTypes);
            
            // Sort dates
            const sortedDates = Object.keys(grouped).sort((a, b) => {
              if (a === 'Mặc định') return -1;
              if (b === 'Mặc định') return 1;
              const [d1, m1, y1] = a.split('/');
              const [d2, m2, y2] = b.split('/');
              return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
            });

            return sortedDates.map(dateStr => {
              const tickets = grouped[dateStr];
              const isExpanded = expandedTicketGroups[`agency_${dateStr}`] || false;
              return (
                <div key={dateStr} style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <div 
                    style={{ padding: '1rem', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setExpandedTicketGroups(prev => ({ ...prev, [`agency_${dateStr}`]: !isExpanded }))}
                  >
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{dateStr !== 'Mặc định' ? `Ngày áp dụng: ${dateStr}` : 'Vé chung (Không chỉ định ngày)'}</strong>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{tickets.length} khán đài {isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #e2e8f0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', background: '#fcfcfc' }}>
                            <th style={{ padding: '10px 1rem', color: '#4a5568' }}>Tên khán đài</th>
                            <th style={{ padding: '10px 1rem', color: '#4a5568' }}>Giá</th>
                            <th style={{ padding: '10px 1rem', color: '#4a5568' }}>Số lượng</th>
                            <th style={{ padding: '10px 1rem', color: '#4a5568', textAlign: 'right' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 1rem', fontWeight: 600 }}>{t.name}</td>
                              <td style={{ padding: '10px 1rem', color: '#0ea5e9', fontWeight: 600 }}>{Number(t.price).toLocaleString('vi-VN')} đ</td>
                              <td style={{ padding: '10px 1rem' }}>{t.totalQuantity} (Còn {t.availableQuantity})</td>
                              <td style={{ padding: '10px 1rem', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => openSeatManager(t)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Tạo ghế</button>
                                <button type="button" onClick={() => { setSeatManagerTicket(null); setTicketForm({ id: t.id, name: t.name, price: t.price, totalQuantity: t.totalQuantity, eventDate: t.eventDate || '' }); setShowTicketForm(true); }} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Sửa</button>
                                <button type="button" onClick={() => deleteTicketType(t.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>Xóa</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Seat Manager UI */}
      {seatManagerTicket && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
          <h5 style={{ fontWeight: 700, marginBottom: '1rem', color: '#1e293b', fontSize: '1rem' }}>
            Sơ đồ ghế: <span style={{ color: '#0ea5e9' }}>{seatManagerTicket.name}</span>
          </h5>

          {/* Seat Status Summary Card (Admin Style) */}
          <div
            style={{
              background: seatManagerTicket.seatCount > 0 ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${seatManagerTicket.seatCount > 0 ? '#a7f3d0' : '#fde68a'}`,
              borderRadius: 12,
              padding: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 4px', color: seatManagerTicket.seatCount > 0 ? '#065f46' : '#92400e' }}>
              {seatManagerTicket.seatCount > 0
                ? `Đã khởi tạo ${seatManagerTicket.seatCount} vị trí ghế`
                : 'Chưa thiết lập sơ đồ vị trí ngồi'}
            </p>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
              {seatManagerTicket.seatCount > 0
                ? 'Hành động tạo mới sơ đồ sẽ xóa toàn bộ danh sách ghế ngồi cũ và không thể khôi phục.'
                : 'Tạo sơ đồ giúp người mua vé chọn được vị trí ngồi tương ứng khi giao dịch.'}
            </p>
          </div>
          
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', marginBottom: '1rem', padding: '0.75rem', background: '#e0e7ff', borderRadius: 8, color: '#3730a3', fontWeight: 500, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={applySeatToAll} onChange={e => setApplySeatToAll(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#4f46e5' }} />
              Đồng thời áp dụng cấu hình này cho tất cả các ngày của khán đài "{seatManagerTicket.name}"
            </label>
            <p style={{ fontWeight: 700, fontSize: '0.88rem', margin: '0 0 1rem', color: '#1e293b' }}>Cấu hình sơ đồ hàng & cột</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={s.label}>Số hàng (A, B, C...)</label>
                <input 
                  style={{ ...s.input, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }} 
                  type="number" 
                  min="1" 
                  max="26" 
                  value={seatConfig.rows} 
                  onChange={e => setSeatConfig({...seatConfig, rows: e.target.value})} 
                />
              </div>
              <div>
                <label style={s.label}>Số cột (01, 02...)</label>
                <input 
                  style={{ ...s.input, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }} 
                  type="number" 
                  min="1" 
                  max="50" 
                  value={seatConfig.cols} 
                  onChange={e => setSeatConfig({...seatConfig, cols: e.target.value})} 
                />
              </div>
            </div>
            
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#e0e7ff',
                borderRadius: 8,
                fontSize: '0.85rem',
                color: '#3730a3',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              Tổng cộng: {Number(seatConfig.rows) * Number(seatConfig.cols)} ghế ngồi
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={generateSeats} 
              disabled={seatLoading} 
              style={{ ...s.btn, flex: 1, padding: '0.8rem', background: '#3b82f6' }}
            >
              {seatLoading 
                ? 'Đang tạo sơ đồ...' 
                : seatManagerTicket.seatCount > 0 
                  ? 'Tạo lại (Reset)' 
                  : 'Xác nhận tạo ghế'}
            </button>
            <button 
              onClick={() => setSeatManagerTicket(null)} 
              style={{ ...s.btn, width: 'auto', padding: '0.8rem 1.5rem', background: '#e2e8f0', color: '#4a5568' }}
            >
              Hủy bỏ
            </button>
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
    page: { display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#1a1a2e' },
    sidebar: { width: 260, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
    sidebarTitle: { padding: '1rem 1.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' },
    roleCard: { margin: '1.25rem 1rem 1rem', padding: '1rem', borderRadius: 16, background: 'linear-gradient(135deg, #064e3b 0%, #00B46E 100%)', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 14px 28px -18px rgba(6, 78, 59, 0.65)' },
    roleIcon: { width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em' },
    roleName: { fontSize: '0.95rem', fontWeight: 850 },
    roleMeta: { marginTop: 2, fontSize: '0.74rem', color: '#dcfce7', lineHeight: 1.35 },
    navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: active ? 600 : 400, color: active ? '#00B46E' : '#4a5568', background: active ? 'rgba(0,180,110,0.06)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: active ? '3px solid #00B46E' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left', fontFamily: 'inherit' }),
    main: { flex: 1, padding: '2rem clamp(2rem, 4vw, 4rem)', maxWidth: 'none', width: '100%', margin: 0 },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '2rem', marginBottom: '1rem' },
    commandGrid: { display: 'grid', gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(260px, 0.9fr) minmax(260px, 0.9fr)', gap: '1.25rem', marginBottom: '2rem' },
    commandPanel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.25rem', boxShadow: '0 10px 24px -18px rgba(15,23,42,0.24)' },
    commandDark: { background: '#0f172a', color: '#fff', borderColor: '#0f172a' },
    panelLabel: { fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: 7 },
    actionRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0', textDecoration: 'none', color: 'inherit', background: 'transparent', width: '100%', borderTop: 0, borderLeft: 0, borderRight: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' },
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

  const formatScanDateTime = (value) => {
    const d = parseDateSafe(value);
    if (!d || isNaN(d)) return 'Chưa có';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getAttendanceTimeline = () => {
    return customers
      .flatMap((customer) => {
        const base = {
          customerName: customer.customerName || 'Khách hàng',
          customerEmail: customer.customerEmail || '',
          eventTitle: customer.eventTitle || 'Sự kiện',
          ticketTypeName: customer.ticketTypeName || 'Vé',
        };
        return [
          customer.checkinTime ? {
            ...base,
            type: 'CHECK_IN',
            label: 'Check-in',
            time: customer.checkinTime,
            sortTime: parseDateSafe(customer.checkinTime)?.getTime() || 0,
          } : null,
          customer.checkoutTime ? {
            ...base,
            type: 'CHECK_OUT',
            label: 'Check-out',
            time: customer.checkoutTime,
            sortTime: parseDateSafe(customer.checkoutTime)?.getTime() || 0,
          } : null,
        ].filter(Boolean);
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  };

  const getCheckTimeSummary = () => {
    const timeline = getAttendanceTimeline();
    const checkins = timeline.filter((item) => item.type === 'CHECK_IN');
    const checkouts = timeline.filter((item) => item.type === 'CHECK_OUT');
    const currentlyInside = customers.filter((customer) => customer.checkinTime && !customer.checkoutTime).length;
    return {
      timeline,
      checkinCount: checkins.length,
      checkoutCount: checkouts.length,
      latestCheckin: checkins[0] || null,
      latestCheckout: checkouts[0] || null,
      currentlyInside,
    };
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
          <div style={s.roleCard}>
            <div style={s.roleIcon}>AG</div>
            <div>
              <div style={s.roleName}>Kênh Đại Lý</div>
              <div style={s.roleMeta}>{userProfile?.fullName || 'Nhà tổ chức'} đang quản lý sự kiện</div>
            </div>
          </div>
          <div style={s.sidebarTitle}>Vận hành đại lý</div>
          <button onClick={() => setActiveTab('dashboard')} style={s.navItem(activeTab === 'dashboard')}>Tổng quan</button>
          <button onClick={() => setActiveTab('revenue')} style={s.navItem(activeTab === 'revenue')}>Doanh thu & Báo cáo</button>
          <button onClick={() => setActiveTab('payout')} style={s.navItem(activeTab === 'payout')}>Sổ cái & Rút tiền</button>
          <button onClick={() => setActiveTab('events')} style={s.navItem(activeTab === 'events')}>Quản lý Sự kiện</button>
          <button onClick={() => setActiveTab('customers')} style={s.navItem(activeTab === 'customers')}>Danh sách Khách hàng</button>
          <button onClick={() => setActiveTab('checkin')} style={s.navItem(activeTab === 'checkin')}>Check-in / Check-out</button>
          <button onClick={() => setActiveTab('reviews')} style={s.navItem(activeTab === 'reviews')}>Quản lý Đánh giá</button>
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

              <div style={s.commandGrid}>
                <div style={{ ...s.commandPanel, ...s.commandDark }}>
                  <div style={{ ...s.panelLabel, color: '#94a3b8' }}>Trung tâm đại lý</div>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 850 }}>Agency Operations</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase' }}>Đang bán</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900 }}>{dashboardStats?.publishedEvents || 0}</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase' }}>Chờ duyệt</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900 }}>{dashboardStats?.pendingEvents || 0}</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase' }}>Khách hàng</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900 }}>{customers.length}</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase' }}>Check-in</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900 }}>{dashboardStats?.checkedInTickets || 0}</div>
                    </div>
                  </div>
                </div>

                <div style={s.commandPanel}>
                  <div style={s.panelLabel}>Tác vụ nhanh</div>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 850 }}>Quản lý trong ngày</h3>
                  <div>
                    <button style={s.actionRow} onClick={() => setActiveTab('events')}>
                      <span><strong>Quản lý sự kiện</strong><span style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>Sửa nội dung, vé, ghế và trạng thái</span></span>
                      <span style={{ color: '#047857', fontWeight: 850 }}>Mở</span>
                    </button>
                    <Link href="/admin/checkin" style={s.actionRow}>
                      <span><strong>Quét QR check-in</strong><span style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>Camera, ảnh QR hoặc nhập mã</span></span>
                      <span style={{ color: '#047857', fontWeight: 850 }}>Mở</span>
                    </Link>
                    <button style={s.actionRow} onClick={() => setActiveTab('customers')}>
                      <span><strong>Danh sách khách</strong><span style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>Theo dõi người mua và trạng thái tham dự</span></span>
                      <span style={{ color: '#047857', fontWeight: 850 }}>Xem</span>
                    </button>
                  </div>
                </div>

                <div style={s.commandPanel}>
                  <div style={s.panelLabel}>Sau sự kiện</div>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 850 }}>Chăm sóc người tham dự</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <strong style={{ display: 'block', marginBottom: 4 }}>Theo dõi phản hồi sau sự kiện</strong>
                      <span style={{ color: '#64748b', fontSize: '0.82rem' }}>Tổng hợp danh sách khách đã tham dự để gửi thông báo hoặc chăm sóc sau chương trình.</span>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#047857', fontWeight: 800 }}>
                      {events.filter(e => e.status === 'CLOSED').length} sự kiện đã đóng cần theo dõi phản hồi
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #8b5cf6', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng doanh thu</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', marginTop: 8 }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardStats?.totalRevenue || 0)}
                  </div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #10b981', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vé đã bán / sức chứa</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: 8 }}>
                    {dashboardStats?.ticketsSold || 0} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>/ {dashboardStats?.totalCapacity || 0} vé</span>
                  </div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #f59e0b', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đã check-in</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: 8 }}>{dashboardStats?.checkedInTickets || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #00B46E', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tỷ lệ tham dự thực tế</div>
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
          {activeTab === 'payout' && (
            <div style={{ padding: "10px 0" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '28px', color: '#1a1a2e', margin: 0, fontWeight: 'bold' }}>Sổ Cái & Yêu Cầu Rút Tiền</h1>
              </div>

              <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                {/* Sổ cái - Số dư */}
                <div style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '24px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                    <svg width="24" height="24" style={{ marginRight: '10px', color: '#00B46E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Sổ Cái Hệ Thống
                  </h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ padding: '20px', backgroundColor: 'rgba(0, 180, 110, 0.1)', borderRadius: '10px', border: '1px solid rgba(0, 180, 110, 0.2)' }}>
                      <p style={{ fontSize: '14px', color: '#009458', margin: '0 0 5px 0', fontWeight: '600' }}>Số dư khả dụng</p>
                      <p style={{ fontSize: '28px', color: '#00B46E', margin: 0, fontWeight: 'bold' }}>
                        {userProfile && userProfile.balance > 0 ? userProfile.balance.toLocaleString("vi-VN") : "24.500.000"} ₫
                      </p>
                      <p style={{ fontSize: '12px', color: '#009458', margin: '10px 0 0 0' }}>Tiền doanh thu từ các sự kiện đã kết thúc và chốt sổ.</p>
                    </div>

                    <div style={{ padding: '20px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                      <p style={{ fontSize: '14px', color: '#b45309', margin: '0 0 5px 0', fontWeight: '600' }}>Tiền đang tạm giữ</p>
                      <p style={{ fontSize: '28px', color: '#d97706', margin: 0, fontWeight: 'bold' }}>
                        {userProfile && userProfile.holdingBalance > 0 ? userProfile.holdingBalance.toLocaleString("vi-VN") : "5.200.000"} ₫
                      </p>
                      <p style={{ fontSize: '12px', color: '#b45309', margin: '10px 0 0 0' }}>Tiền vé khách đã thanh toán, sẽ được mở khóa sau khi sự kiện kết thúc.</p>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#555', marginBottom: '15px' }}>Cơ chế & Chính sách thanh toán</h3>
                    <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '15px', lineHeight: '1.6', margin: 0 }}>
                      <li style={{ marginBottom: '8px' }}>Khách hàng thanh toán vé qua VNPay, tiền sẽ vào trạng thái <strong>Tạm giữ</strong>.</li>
                      <li style={{ marginBottom: '8px' }}>Hệ thống tự động chia sẻ doanh thu (Split Payment) theo tỷ lệ: Nền tảng <strong>10%</strong> - Đại lý <strong>90%</strong>.</li>
                      <li>Sau khi sự kiện kết thúc, tiền được cộng vào <strong>Số dư khả dụng</strong>. Đại lý có thể yêu cầu rút tiền ngay.</li>
                    </ul>
                  </div>
                </div>

                {/* Form rút tiền */}
                <div style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '24px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                    <svg width="24" height="24" style={{ marginRight: '10px', color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                    Tạo Yêu Cầu Rút Tiền
                  </h2>
                  
                  <form onSubmit={handlePayoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Số tiền muốn rút</label>
                      <input 
                        type="number" 
                        value={payoutForm.amount}
                        onChange={(e) => setPayoutForm({...payoutForm, amount: e.target.value})}
                        style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
                        placeholder="Nhập số tiền"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Ngân hàng thụ hưởng</label>
                      <select 
                        value={payoutForm.bankName}
                        onChange={(e) => setPayoutForm({...payoutForm, bankName: e.target.value})}
                        style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none', backgroundColor: '#fff' }}
                      >
                        <option value="Vietcombank">Vietcombank</option>
                        <option value="Techcombank">Techcombank</option>
                        <option value="MBBank">MBBank</option>
                        <option value="ACB">ACB</option>
                        <option value="BIDV">BIDV</option>
                        <option value="VietinBank">VietinBank</option>
                        <option value="TPBank">TPBank</option>
                        <option value="VPBank">VPBank</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Tên chủ tài khoản</label>
                      <input 
                        type="text" 
                        value={payoutForm.bankAccountName}
                        onChange={(e) => setPayoutForm({...payoutForm, bankAccountName: e.target.value})}
                        style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none', textTransform: 'uppercase' }}
                        placeholder="VD: NGUYEN VAN A"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Số tài khoản</label>
                      <input 
                        type="text" 
                        value={payoutForm.bankAccountNumber}
                        onChange={(e) => setPayoutForm({...payoutForm, bankAccountNumber: e.target.value})}
                        style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
                        placeholder="Nhập số tài khoản"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={!payoutForm.amount}
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        backgroundColor: (!payoutForm.amount) ? '#94a3b8' : '#2563eb', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        cursor: (!payoutForm.amount) ? 'not-allowed' : 'pointer',
                        marginTop: '10px',
                        boxShadow: (!payoutForm.amount) ? 'none' : '0 4px 6px rgba(37, 99, 235, 0.2)'
                      }}
                    >
                      Gửi Yêu Cầu Rút Tiền
                    </button>
                  </form>
                </div>
              </div>
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

          {activeTab === 'checkin' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 850, marginBottom: '0.4rem' }}>Check-in / Check-out sự kiện</h2>
                  <p style={{ color: '#64748b', margin: 0 }}>Theo dõi vé đã quét, khách chưa đến và mở trình quét QR cho cổng sự kiện.</p>
                </div>
                <Link href="/admin/checkin" style={{ ...s.btn, width: 'auto', textDecoration: 'none', padding: '10px 18px' }}>Mở máy quét QR</Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #10b981', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Đã check-in</div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#10b981', marginTop: 8 }}>{dashboardStats?.checkedInTickets || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #3b82f6', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Vé đã bán</div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#3b82f6', marginTop: 8 }}>{dashboardStats?.ticketsSold || 0}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #f59e0b', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Chưa đến</div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#f59e0b', marginTop: 8 }}>{Math.max((dashboardStats?.ticketsSold || 0) - (dashboardStats?.checkedInTickets || 0), 0)}</div>
                </div>
                <div style={{ ...s.card, padding: '1.5rem', borderLeft: '4px solid #8b5cf6', margin: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Tỷ lệ tham dự</div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#8b5cf6', marginTop: 8 }}>{Math.round(dashboardStats?.attendanceRate || 0)}%</div>
                </div>
              </div>

              {(() => {
                const checkTimeSummary = getCheckTimeSummary();
                const timeline = checkTimeSummary.timeline.slice(0, 8);
                return (
                  <div style={{ ...s.card, padding: '1.5rem', margin: '0 0 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      <div>
                        <div style={s.panelLabel}>Xác thực realtime</div>
                        <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.15rem', fontWeight: 850 }}>Khung giờ quét check-in / check-out</h3>
                        <p style={{ margin: '0.45rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>Mỗi lần quét thành công sẽ ghi lại đúng thời điểm vào/ra của từng vé.</p>
                      </div>
                      <span style={{ ...s.badge('#ecfdf5', '#047857'), padding: '8px 12px' }}>
                        Đang trong sự kiện: {checkTimeSummary.currentlyInside}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ padding: '1rem', border: '1px solid #dbeafe', borderRadius: 14, background: '#eff6ff' }}>
                        <div style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 850, textTransform: 'uppercase' }}>Khung giờ check-in mới nhất</div>
                        <div style={{ marginTop: 8, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                          {checkTimeSummary.latestCheckin ? formatScanDateTime(checkTimeSummary.latestCheckin.time) : 'Chưa có lượt check-in'}
                        </div>
                        <div style={{ marginTop: 6, color: '#64748b', fontSize: '0.84rem', fontWeight: 700 }}>Tổng check-in: {checkTimeSummary.checkinCount}</div>
                      </div>
                      <div style={{ padding: '1rem', border: '1px solid #dcfce7', borderRadius: 14, background: '#f0fdf4' }}>
                        <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 850, textTransform: 'uppercase' }}>Khung giờ check-out mới nhất</div>
                        <div style={{ marginTop: 8, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                          {checkTimeSummary.latestCheckout ? formatScanDateTime(checkTimeSummary.latestCheckout.time) : 'Chưa có lượt check-out'}
                        </div>
                        <div style={{ marginTop: 6, color: '#64748b', fontSize: '0.84rem', fontWeight: 700 }}>Tổng check-out: {checkTimeSummary.checkoutCount}</div>
                      </div>
                    </div>

                    {timeline.length === 0 ? (
                      <div style={{ padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: 12, color: '#64748b', fontWeight: 750, textAlign: 'center' }}>
                        Chưa có nhật ký quét. Khi quét QR thành công, giờ check-in/check-out sẽ hiện tại đây.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                              <th style={{ textAlign: 'left', padding: '11px 10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Thời gian quét</th>
                              <th style={{ textAlign: 'left', padding: '11px 10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Trạng thái</th>
                              <th style={{ textAlign: 'left', padding: '11px 10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Khách hàng</th>
                              <th style={{ textAlign: 'left', padding: '11px 10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Sự kiện</th>
                              <th style={{ textAlign: 'left', padding: '11px 10px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Loại vé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timeline.map((item, idx) => (
                              <tr key={`${item.type}-${idx}-${item.sortTime}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 10px', fontWeight: 850, color: '#0f172a', whiteSpace: 'nowrap' }}>{formatScanDateTime(item.time)}</td>
                                <td style={{ padding: '12px 10px' }}>
                                  <span style={s.badge(item.type === 'CHECK_IN' ? '#dcfce7' : '#dbeafe', item.type === 'CHECK_IN' ? '#047857' : '#2563eb')}>{item.label}</span>
                                </td>
                                <td style={{ padding: '12px 10px' }}>
                                  <div style={{ fontWeight: 800 }}>{item.customerName}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{item.customerEmail}</div>
                                </td>
                                <td style={{ padding: '12px 10px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.eventTitle}</td>
                                <td style={{ padding: '12px 10px', fontWeight: 750 }}>{item.ticketTypeName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const sold = Number(dashboardStats?.ticketsSold || 0);
                const checked = Number(dashboardStats?.checkedInTickets || 0);
                const total = Math.max(sold, checked, 1);
                const checkedPct = Math.round((checked / total) * 100);
                const rows = getEventPerformanceRows().slice(0, 6);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ ...s.card, padding: '1.5rem', margin: 0 }}>
                      <div style={s.panelLabel}>Biểu đồ tham dự</div>
                      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 850 }}>Tổng quan check-in</h3>
                      <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto 1rem' }}>
                        <svg width="220" height="220" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                          <circle cx="60" cy="60" r="48" fill="none" stroke="#10b981" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${checkedPct * 3.016} ${301.6 - checkedPct * 3.016}`} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 48, borderRadius: '50%', display: 'grid', placeContent: 'center', textAlign: 'center', background: '#fff', boxShadow: 'inset 0 0 0 1px #e2e8f0' }}>
                          <strong style={{ fontSize: '1.8rem', fontWeight: 900 }}>{checkedPct}%</strong>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Đã check-in</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', color: '#64748b', fontSize: '0.82rem', fontWeight: 800 }}>
                        <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 99, background: '#10b981', marginRight: 6 }} />Đã check-in: {checked}</span>
                        <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 99, background: '#e2e8f0', marginRight: 6 }} />Chưa đến: {Math.max(sold - checked, 0)}</span>
                      </div>
                    </div>

                    <div style={{ ...s.card, padding: '1.5rem', margin: 0 }}>
                      <div style={s.panelLabel}>Theo sự kiện</div>
                      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 850 }}>Tỷ lệ tham dự từng sự kiện</h3>
                      {rows.length === 0 ? (
                        <div style={{ padding: '1.5rem', border: '1px dashed #cbd5e1', borderRadius: 12, color: '#64748b', fontWeight: 700, textAlign: 'center' }}>Chưa có dữ liệu check-in.</div>
                      ) : rows.map(ev => {
                        const rate = ev.ticketsSold > 0 ? Math.round((ev.checkedIn / ev.ticketsSold) * 100) : 0;
                        return (
                          <div key={ev.id} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: 7, fontSize: '0.86rem', fontWeight: 800 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                              <strong>{rate}%</strong>
                            </div>
                            <div style={{ height: 9, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(rate, 100)}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #10b981, #2563eb)' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div style={{ ...s.commandGrid, display: 'none' }}>
                <div style={{ ...s.commandPanel, ...s.commandDark }}>
                  <div style={{ ...s.panelLabel, color: '#94a3b8' }}>Quy trình cổng</div>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 850 }}>Kiểm soát vé hợp lệ</h3>
                  {['Quét QR trên vé', 'Xác thực token', 'Chặn check-in 2 lần', 'Ghi nhận người tham dự'].map(step => (
                    <div key={step} style={{ padding: '0.7rem 0.8rem', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', marginBottom: 10, fontWeight: 750 }}>{step}</div>
                  ))}
                </div>
                <div style={{ ...s.commandPanel, gridColumn: 'span 2' }}>
                  <div style={s.panelLabel}>Hiệu suất sự kiện</div>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 850 }}>Bảng check-in theo sự kiện</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '12px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Sự kiện</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Vé bán</th>
                          <th style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Check-in</th>
                          <th style={{ textAlign: 'right', padding: '12px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tỷ lệ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getEventPerformanceRows().map(ev => {
                          const rate = ev.ticketsSold > 0 ? Math.round((ev.checkedIn / ev.ticketsSold) * 100) : 0;
                          return (
                            <tr key={ev.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '12px', fontWeight: 800 }}>{ev.title}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>{ev.ticketsSold}</td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#10b981', fontWeight: 850 }}>{ev.checkedIn}</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 850 }}>{rate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Giờ check-in</th>
                        <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Giờ check-out</th>
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
                          <td style={{ padding: '12px 10px', color: '#0f172a', whiteSpace: 'nowrap', fontWeight: 700 }}>{formatScanDateTime(c.checkinTime)}</td>
                          <td style={{ padding: '12px 10px', color: '#0f172a', whiteSpace: 'nowrap', fontWeight: 700 }}>{formatScanDateTime(c.checkoutTime)}</td>
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

          {activeTab === 'reviews' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Quản lý Đánh giá & Phản hồi</h2>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Lọc theo sự kiện:</label>
                  <select 
                    value={reviewFilterEvent} 
                    onChange={(e) => setReviewFilterEvent(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Tất cả sự kiện</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Lọc theo đánh giá sao:</label>
                  <select 
                    value={reviewFilterRating} 
                    onChange={(e) => setReviewFilterRating(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">Tất cả số sao</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                    <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                    <option value="3">⭐⭐⭐ (3 sao)</option>
                    <option value="2">⭐⭐ (2 sao)</option>
                    <option value="1">⭐ (1 sao)</option>
                  </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Tổng số đánh giá</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{reviews.length}</div>
                  </div>
                </div>
              </div>

              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid rgba(0,180,110,0.3)', borderTopColor: '#00B46E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.9rem' }}>Đang tải đánh giá...</p>
                </div>
              ) : (() => {
                const displayReviews = reviews.filter(r => {
                  const matchEvent = reviewFilterEvent === 'all' || r.eventId.toString() === reviewFilterEvent;
                  const matchRating = reviewFilterRating === 'all' || r.rating.toString() === reviewFilterRating;
                  return matchEvent && matchRating;
                });

                if (displayReviews.length === 0) {
                  return (
                    <div style={{ ...s.card, textAlign: 'center', padding: '3rem 2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#334155' }}>Không tìm thấy đánh giá nào</h3>
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Chưa có đánh giá nào phù hợp với bộ lọc hiện tại.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ ...s.card, padding: '1rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', background: '#f8fafc' }}>
                          <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Sinh viên</th>
                          <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Sự kiện</th>
                          <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700, textAlign: 'center' }}>Đánh giá</th>
                          <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Nội dung nhận xét</th>
                          <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700 }}>Ngày tạo</th>
                          <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700, textAlign: 'center' }}>Trạng thái</th>
                          <th style={{ padding: '12px 10px', color: '#4a5568', fontWeight: 700, textAlign: 'center' }}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayReviews.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: r.hidden ? '#fff1f2' : 'transparent' }}>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.studentName}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.studentEmail}</div>
                            </td>
                            <td style={{ padding: '12px 10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.eventTitle}>
                              {r.eventTitle}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px', maxWidth: '300px', wordBreak: 'break-word', color: r.hidden ? '#94a3b8' : '#334155' }}>
                              {r.comment || <em style={{ color: '#94a3b8' }}>Không có nhận xét</em>}
                            </td>
                            <td style={{ padding: '12px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {new Date(r.createdAt).toLocaleDateString('vi-VN')} {new Date(r.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <span style={s.badge(
                                r.hidden ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                r.hidden ? '#ef4444' : '#10b981'
                              )}>
                                {r.hidden ? 'Bị Ẩn' : 'Hiển thị'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <button
                                onClick={() => toggleReviewHide(r.id)}
                                style={{
                                  background: r.hidden ? '#10b981' : '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {r.hidden ? 'Hiển thị lại' : 'Ẩn bình luận'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
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
      
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '12px 24px', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 600, fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
        </div>
      )}
    </>
  );
}
