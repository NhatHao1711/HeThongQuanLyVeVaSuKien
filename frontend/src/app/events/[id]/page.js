'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn } from '@/lib/api';
import { icons } from '@/components/Icons';
import styles from './event-detail.module.css';
import SeatMap from '@/components/SeatMap';

export default function EventDetailPage({ params }) {
  const { id } = React.use(params);
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState({});
  const [selectedSeatIds, setSelectedSeatIds] = useState({}); // Tracks seat IDs per ticket type { ticketTypeId: [1, 2, 3] }
  const [selectedSeatObjects, setSelectedSeatObjects] = useState({}); // Tracks seat objects with names { ticketTypeId: [{id, name, status}] }
  const [activeTicketTypeId, setActiveTicketTypeId] = useState(null); // Which ticket type tab is active
  const [bookingStep, setBookingStep] = useState('select'); // 'select' | 'confirm' | 'payment' | 'success'
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherResult, setVoucherResult] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalCount: 0 });
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, active: false });
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    loadEvent();
    loadReviews();
    loadRelatedEvents();
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!event?.startTime) return;
    const target = new Date(event.startTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, active: false }); return; }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        active: true
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [event?.startTime]);

  const loadRelatedEvents = async () => {
    try {
      const res = await apiRequest('/events');
      if (res.success) {
        const related = (res.data || []).filter(e => e.id !== parseInt(id) && e.category?.id === event?.category?.id).slice(0, 3);
        setRelatedEvents(related.length > 0 ? related : (res.data || []).filter(e => e.id !== parseInt(id)).slice(0, 3));
      }
    } catch (e) {}
  };

  const loadEvent = async () => {
    try {
      const res = await apiRequest(`/events/${id}`);
      if (res.success) {
        setEvent(res.data);
        setTicketTypes(res.data.ticketTypes || []);
        // Set first ticket type as active by default
        if (res.data.ticketTypes?.length > 0) {
          setActiveTicketTypeId(res.data.ticketTypes[0].id);
        }
      } else {
        setError('Không tìm thấy sự kiện');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn()) {
      apiRequest(`/favorites/check/${id}`).then(res => {
        if (res.success) setIsFavorited(res.data.favorited);
      }).catch(() => {});
    }
  }, [id]);

  const toggleFavorite = async () => {
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    try {
      const res = await apiRequest(`/favorites/${id}`, { method: 'POST' });
      if (res.success) setIsFavorited(res.data.favorited);
    } catch (e) { console.error(e); }
  };

  const loadReviews = async () => {
    try {
      const res = await apiRequest(`/events/${id}/reviews`);
      if (res.success) {
        setReviews(res.data.reviews || []);
        setReviewStats({ averageRating: res.data.averageRating || 0, totalCount: res.data.totalCount || 0 });
      }
    } catch (e) { console.error(e); }
  };

  const submitReview = async () => {
    if (myRating === 0) { setReviewMsg('Vui lòng chọn số sao!'); return; }
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    setReviewSubmitting(true);
    setReviewMsg('');
    try {
      const res = await apiRequest(`/events/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: myRating, comment: myComment })
      });
      if (res.success) {
        setReviewMsg('✅ Đánh giá thành công!');
        setMyRating(0);
        setMyComment('');
        loadReviews();
      } else {
        setReviewMsg(res.message || 'Có lỗi xảy ra');
      }
    } catch (e) { setReviewMsg('Lỗi kết nối'); }
    finally { setReviewSubmitting(false); }
  };

  const StarRating = ({ rating, interactive, onRate }) => (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(star => (
        <span key={star} onClick={() => interactive && onRate(star)} style={{
          cursor: interactive ? 'pointer' : 'default', fontSize: '1.3rem',
          color: star <= rating ? '#f59e0b' : '#d1d5db',
          transition: 'color 0.15s'
        }}>{star <= rating ? '★' : '☆'}</span>
      ))}
    </div>
  );

  const handleSeatsSelected = (ticketTypeId, seatIds, seatObjects) => {
    // When seats are selected from SeatMap, update seat IDs, seat objects, and quantity
    setSelectedSeatIds(prev => ({
      ...prev,
      [ticketTypeId]: seatIds
    }));
    
    // Store seat objects with names for display in confirmation
    setSelectedSeatObjects(prev => ({
      ...prev,
      [ticketTypeId]: seatObjects || []
    }));
    
    // Update quantity based on selected seats count
    if (seatIds.length === 0) {
      const newSelected = { ...selectedTickets };
      delete newSelected[ticketTypeId];
      setSelectedTickets(newSelected);
    } else {
      setSelectedTickets(prev => ({
        ...prev,
        [ticketTypeId]: seatIds.length
      }));
    }
  };

  const calculateTotal = () => {
    return Object.entries(selectedTickets).reduce((sum, [typeId, qty]) => {
      const ticketType = ticketTypes.find(t => t.id == typeId);
      return sum + (ticketType?.price || 0) * qty;
    }, 0);
  };

  const getTotalSeatsCount = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getAllSelectedSeatNames = () => {
    const allNames = [];
    Object.entries(selectedSeatIds).forEach(([typeId, seatIds]) => {
      if (seatIds && seatIds.length > 0) {
        const ticketType = ticketTypes.find(t => t.id == typeId);
        const typeName = ticketType?.name || 'Vé';
        // We'll collect them; the SeatMap component stores IDs, not names,
        // but we'll show the count per type
        allNames.push(`${typeName} (${seatIds.length} ghế)`);
      }
    });
    return allNames;
  };

  const handleBooking = async () => {
    if (Object.keys(selectedTickets).length === 0) {
      setError('Vui lòng chọn ít nhất một vé');
      return;
    }
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    
    setError('');
    try {
      // Backend expects single { ticketTypeId, quantity } per request
      const entries = Object.entries(selectedTickets);
      let allOrderIds = [];
      let grandTotal = 0;
      let lastResponse = null;
      
      for (const [typeId, qty] of entries) {
        const bookingBody = {
          ticketTypeId: parseInt(typeId),
          quantity: qty,
          seatIds: selectedSeatIds[typeId] || []
        };
        // Include voucher code if applied
        if (voucherResult?.success && voucherCode.trim()) {
          bookingBody.voucherCode = voucherCode.trim();
        }
        const res = await apiRequest('/bookings', {
          method: 'POST',
          body: JSON.stringify(bookingBody),
        });
        if (res.success) {
          lastResponse = res.data;
          allOrderIds.push(res.data.orderId);
          grandTotal += parseFloat(res.data.totalAmount) || 0;
        } else {
          setError(res.message || 'Đặt vé thất bại');
          return;
        }
      }
      
      if (lastResponse) {
        // Override totalAmount with the accumulated grand total
        setBooking({
          ...lastResponse,
          totalAmount: grandTotal,
          allOrderIds: allOrderIds,
          orderId: allOrderIds.join(', ')
        });
        setBookingStep('payment');
      }
    } catch {
      setError('Lỗi kết nối server');
    }
  };

  const handleConfirmPayment = () => {
    setBookingStep('success');
  };

  const getBankQRUrl = (amount) => {
    const info = `TRIVENT ${booking?.orderId || ''}`;
    return `https://img.vietqr.io/image/VCB-1030490936-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent('TRUONG HUY NHAT HAO')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(price);
  };

  const openBookingModal = () => {
    setShowBookingModal(true);
    setBookingStep('select');
    setError('');
    document.body.style.overflow = 'hidden';
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    document.body.style.overflow = '';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.spinner}>
            <div className="spinner"></div>
            <p>Đang tải thông tin sự kiện...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.notFound}>
            <p>🎉 Sự kiện không tồn tại</p>
            <Link href="/events" className="btn btn-primary">Quay lại danh sách sự kiện</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        {/* Hero Banner */}
        <div className={styles.heroBanner}
          style={event.imageUrl ? { backgroundImage: `url(http://localhost:8080${event.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {!event.imageUrl && (
            <div className={styles.heroBg}>
              <div className={styles.imagePlaceholder}>
                {event.category?.name?.includes('Nhạc') && '🎵'}
                {event.category?.name?.includes('Sân') && '🎭'}
                {event.category?.name?.includes('Thể') && '⚽'}
                {!event.category?.name && '🎪'}
              </div>
            </div>
          )}
          <Link href="/events" className={styles.backBtn}>
            ← Quay lại
          </Link>
          <button onClick={toggleFavorite} style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.95)',
            border: 'none', borderRadius: '50%', width: 44, height: 44,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'transform 0.2s'
          }}>
            {icons.heart(22, isFavorited ? '#e91e63' : '#999', isFavorited)}
          </button>
        </div>

        <div className={styles.content}>
          {/* Main Section */}
          <div className={styles.mainSection}>
            {/* Event Header */}
            <div className={styles.eventHeader}>
              <div>
                <h1 className={styles.title}>{event.title}</h1>
                <div className={styles.metadata}>
                  <span className={styles.metaItem} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {icons.mapPin(16, '#666')} {event.location || 'Địa điểm chưa xác định'}
                  </span>
                  <span className={styles.metaItem} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {icons.calendar(16, '#666')} {formatDate(event.startTime)} {formatTime(event.startTime)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400')}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #1877f2', background: '#1877f2', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Facebook
                </button>
                <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400')}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #1da1f2', background: '#000', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  X
                </button>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Đã sao chép link!'); }}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', background: '#f8f9fa', color: '#333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Copy link
                </button>
              </div>
            </div>

            {/* Event Stats */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Nhà tổ chức</span>
                <span className={styles.statValue}>{event.organizer || 'N/A'}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Danh mục</span>
                <span className={styles.statValue}>{event.category?.name || 'Khác'}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Trạng thái</span>
                <span className={styles.statValue}>
                  {(() => {
                    const now = new Date();
                    const start = new Date(event.startTime);
                    const end = new Date(event.endTime);
                    if (event.status === 'CANCELLED') return '🔴 Đã hủy';
                    if (now < start) return '🟡 Sắp diễn ra';
                    if (now >= start && now <= end) return '🟢 Đang diễn ra';
                    return '⚫ Đã kết thúc';
                  })()}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className={styles.section}>
              <h2>Mô tả sự kiện</h2>
              <div className={styles.description}>
                {event.description || 'Không có mô tả'}
              </div>
            </div>

            {/* Event Details */}
            <div className={styles.section}>
              <h2>Thông tin chi tiết</h2>
              <div className={styles.details}>
                <div className={styles.detailItem}>
                  <strong>Ngày bắt đầu:</strong>
                  <p>{new Date(event.startTime).toLocaleString('vi-VN')}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>Ngày kết thúc:</strong>
                  <p>{new Date(event.endTime).toLocaleString('vi-VN')}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>Số lượng vé:</strong>
                  <p>{event.quantities || 'Không xác định'}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>Điểm xuất phát:</strong>
                  <p>{event.startPoint || 'N/A'}</p>
                </div>
              </div>
            </div>


          </div>

          {/* Sidebar - Simplified: Only Book Now + Countdown + Share */}
          <aside className={styles.sidebar}>
            {/* Book Now Card */}
            <div className={styles.bookingCard}>
              <h2 className={styles.bookingTitle}>🎫 Đặt vé</h2>
              <p style={{ fontSize: '0.88rem', color: '#4a5568', marginBottom: '1rem', lineHeight: 1.6 }}>
                Chọn loại vé và vị trí ghế ngồi yêu thích của bạn.
              </p>
              {ticketTypes.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.3rem' }}>
                    <span>Giá từ</span>
                    <span>đến</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#00B46E' }}>
                      {formatPrice(Math.min(...ticketTypes.map(t => t.price)))}
                    </span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#00B46E' }}>
                      {formatPrice(Math.max(...ticketTypes.map(t => t.price)))}
                    </span>
                  </div>
                </div>
              )}
              <button 
                className={styles.bookNowBtn}
                onClick={openBookingModal}
              >
                🎟️ Đặt vé ngay
              </button>
            </div>

            {/* Countdown Timer */}
            {countdown.active && (
              <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem', opacity: 0.9, textAlign: 'center' }}>⏰ Bắt đầu sau</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                  {[{ v: countdown.days, l: 'Ngày' }, { v: countdown.hours, l: 'Giờ' }, { v: countdown.minutes, l: 'Phút' }, { v: countdown.seconds, l: 'Giây' }].map((item, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.5rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>{String(item.v).padStart(2, '0')}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 2 }}>{item.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share Section */}
            <div className={styles.shareSection}>
              <p className={styles.shareLabel}>Chia sẻ sự kiện</p>
              <div className={styles.shareButtons}>
                <button className={styles.shareBtn} title="Facebook">f</button>
                <button className={styles.shareBtn} title="Twitter">𝕏</button>
                <button className={styles.shareBtn} title="Copy link">🔗</button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ==================== BOOKING MODAL ==================== */}
      {showBookingModal && (
        <div className={styles.bookingModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeBookingModal(); }}>
          <div className={styles.bookingModal}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>🎫 Đặt vé - {event.title}</h2>
                <p className={styles.modalSubtitle}>
                  {icons.mapPin(14, '#94a3b8')} {event.location} • {icons.calendar(14, '#94a3b8')} {formatDate(event.startTime)}
                </p>
              </div>
              <button className={styles.modalCloseBtn} onClick={closeBookingModal}>✕</button>
            </div>

            {bookingStep === 'select' && (
              <>
                {/* Ticket Type Tabs */}
                <div className={styles.ticketTypeTabs}>
                  {ticketTypes.map(ticket => (
                    <button
                      key={ticket.id}
                      className={`${styles.ticketTypeTab} ${activeTicketTypeId === ticket.id ? styles.ticketTypeTabActive : ''}`}
                      onClick={() => setActiveTicketTypeId(ticket.id)}
                    >
                      <span className={styles.tabTicketName}>{ticket.name || 'Vé'}</span>
                      <span className={styles.tabTicketPrice}>{formatPrice(ticket.price)}</span>
                      {(selectedTickets[ticket.id] || 0) > 0 && (
                        <span className={styles.tabBadge}>{selectedTickets[ticket.id]}</span>
                      )}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className={styles.modalError}>{error}</div>
                )}

                {/* Seat Map Area */}
                <div className={styles.seatMapArea}>
                  {activeTicketTypeId && (
                    <SeatMap
                      key={activeTicketTypeId}
                      ticketTypeId={activeTicketTypeId}
                      onSeatsSelected={(seats, seatObjects) => handleSeatsSelected(activeTicketTypeId, seats, seatObjects)}
                    />
                  )}
                </div>

                {/* Bottom Summary Bar */}
                <div className={styles.modalBottomBar}>
                  <div className={styles.bottomBarInfo}>
                    <div className={styles.bottomBarRow}>
                      <div className={styles.bottomBarStat}>
                        <span className={styles.bottomBarLabel}>Tổng ghế đã chọn</span>
                        <span className={styles.bottomBarValue}>{getTotalSeatsCount()} ghế</span>
                      </div>
                      <div className={styles.bottomBarStat}>
                        <span className={styles.bottomBarLabel}>Vị trí đã chọn</span>
                        <span className={styles.bottomBarValue}>
                          {getAllSelectedSeatNames().length > 0
                            ? getAllSelectedSeatNames().join(', ')
                            : 'Chưa chọn ghế'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.bottomBarPayment}>
                    <div className={styles.totalSection}>
                      <span className={styles.totalLabel}>Tổng tiền</span>
                      <span className={styles.totalAmount}>{formatPrice(calculateTotal())}</span>
                    </div>
                    <button
                      className={styles.paymentBtn}
                      onClick={() => { setError(''); setBookingStep('confirm'); }}
                      disabled={getTotalSeatsCount() === 0}
                    >
                      Tiếp tục →
                    </button>
                  </div>
                </div>
              </>
            )}

            {bookingStep === 'confirm' && (
              <div className={styles.paymentContent}>
                <h2 className={styles.bookingTitle}>📋 Xác nhận đơn hàng</h2>

                {/* Event Info Summary */}
                <div className={styles.confirmEventInfo}>
                  <div className={styles.confirmEventRow}>
                    <span className={styles.confirmEventLabel}>🎪 Sự kiện</span>
                    <span className={styles.confirmEventValue}>{event.title}</span>
                  </div>
                  <div className={styles.confirmEventRow}>
                    <span className={styles.confirmEventLabel}>📍 Địa điểm</span>
                    <span className={styles.confirmEventValue}>{event.location || 'Chưa xác định'}</span>
                  </div>
                  <div className={styles.confirmEventRow}>
                    <span className={styles.confirmEventLabel}>📅 Thời gian</span>
                    <span className={styles.confirmEventValue}>{formatDate(event.startTime)} - {formatTime(event.startTime)}</span>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className={styles.confirmOrderSummary}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>🎫 Chi tiết vé đã chọn</p>
                  {Object.entries(selectedTickets).map(([typeId, qty]) => {
                    const ticket = ticketTypes.find(t => t.id == typeId);
                    const seatObjs = selectedSeatObjects[typeId] || [];
                    const seatNames = seatObjs.map(s => s.name).sort();
                    return (
                      <div key={typeId} className={styles.confirmOrderItem}>
                        <div style={{ flex: 1 }}>
                          <p className={styles.confirmItemName}>{ticket?.name || 'Vé'}</p>
                          <p className={styles.confirmItemMeta}>Số lượng: {qty} ghế × {formatPrice(ticket?.price || 0)}</p>
                          {seatNames.length > 0 && (
                            <div className={styles.confirmSeatTags}>
                              <span style={{ fontSize: '0.78rem', color: '#6b7280', marginRight: '0.4rem' }}>Ghế:</span>
                              {seatNames.map(name => (
                                <span key={name} className={styles.seatTag}>{name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={styles.confirmItemTotal}>{formatPrice((ticket?.price || 0) * qty)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Voucher Section */}
                <div className={styles.confirmVoucherSection}>
                  <p className={styles.confirmVoucherLabel}>🏷️ Mã giảm giá</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Nhập mã voucher..."
                      value={voucherCode}
                      onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setVoucherResult(null); }}
                      className={styles.voucherInput}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={async () => {
                        if (!voucherCode.trim()) return;
                        setVoucherLoading(true);
                        try {
                          const res = await apiRequest('/vouchers/apply', {
                            method: 'POST',
                            body: JSON.stringify({ code: voucherCode.trim(), amount: calculateTotal() }),
                          });
                          if (res.success) {
                            setVoucherResult({ success: true, ...res.data });
                          } else {
                            setVoucherResult({ success: false, message: res.message });
                          }
                        } catch { setVoucherResult({ success: false, message: 'Lỗi kết nối' }); }
                        finally { setVoucherLoading(false); }
                      }}
                      disabled={voucherLoading || !voucherCode.trim()}
                      className={styles.voucherApplyBtn}
                    >
                      {voucherLoading ? '...' : 'Áp dụng'}
                    </button>
                  </div>
                  {voucherResult && (
                    <div className={`${styles.voucherMsg} ${voucherResult.success ? styles.voucherSuccess : styles.voucherFail}`} style={{ marginTop: 8 }}>
                      {voucherResult.success
                        ? `✅ ${voucherResult.description} (-${formatPrice(voucherResult.discount)})`
                        : `❌ ${voucherResult.message}`}
                    </div>
                  )}
                </div>

                {/* Price Summary */}
                <div className={styles.confirmPriceSummary}>
                  {Object.entries(selectedTickets).map(([typeId, qty]) => {
                    const ticket = ticketTypes.find(t => t.id == typeId);
                    return (
                      <div key={typeId} className={styles.confirmPriceRow}>
                        <span>{ticket?.name} × {qty}</span>
                        <span>{formatPrice((ticket?.price || 0) * qty)}</span>
                      </div>
                    );
                  })}
                  <div className={styles.confirmPriceRow} style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem', marginTop: '0.3rem' }}>
                    <span>Tạm tính:</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(calculateTotal())}</span>
                  </div>
                  {voucherResult?.success && (
                    <div className={styles.confirmPriceRow} style={{ color: '#16a34a' }}>
                      <span>Giảm giá:</span>
                      <span style={{ fontWeight: 600 }}>-{formatPrice(voucherResult.discount)}</span>
                    </div>
                  )}
                  <div className={styles.confirmPriceTotal}>
                    <span>Tổng thanh toán:</span>
                    <span className={styles.totalAmount}>
                      {voucherResult?.success ? formatPrice(voucherResult.finalAmount) : formatPrice(calculateTotal())}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className={styles.modalError} style={{ margin: '0 0 1rem' }}>{error}</div>
                )}

                <button
                  className={styles.bookBtn}
                  onClick={async () => {
                    // Tạo booking trên server khi user xác nhận
                    await handleBooking();
                    // handleBooking tự set bookingStep sang 'payment' nếu thành công
                  }}
                >
                  Xác nhận & Thanh toán
                </button>
                <button
                  className={styles.backBtnSmall}
                  onClick={() => setBookingStep('select')}
                >
                  ← Quay lại chọn ghế
                </button>
              </div>
            )}

            {bookingStep === 'payment' && (
              <div className={styles.paymentContent}>
                <h2 className={styles.bookingTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{icons.creditCard(22)} Chuyển khoản ngân hàng</h2>
                
                {/* Bank Info */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: '#6b7280' }}>Ngân hàng:</span>
                      <span style={{ fontWeight: 700, color: '#1a1a2e' }}>Vietcombank</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: '#6b7280' }}>Số tài khoản:</span>
                      <span style={{ fontWeight: 700, color: '#1a1a2e', fontFamily: 'monospace', letterSpacing: 1 }}>1030490936</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: '#6b7280' }}>Chủ TK:</span>
                      <span style={{ fontWeight: 700, color: '#1a1a2e' }}>TRUONG HUY NHAT HAO</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: '#6b7280' }}>Nội dung CK:</span>
                      <span style={{ fontWeight: 700, color: '#00B46E', fontFamily: 'monospace' }}>TRIVENT {booking?.orderId || ''}</span>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '8px' }}>Quét mã QR để chuyển khoản nhanh:</p>
                  <img 
                    src={getBankQRUrl(booking?.totalAmount || calculateTotal())} 
                    alt="QR Chuyển khoản" 
                    style={{ width: '100%', maxWidth: 260, borderRadius: 12, border: '1px solid #e2e8f0' }}
                  />
                </div>

                <div className={styles.summary} style={{ marginBottom: '16px' }}>
                  <div className={styles.summaryRow}>
                    <span>Tổng thanh toán:</span>
                    <span className={styles.totalPrice}>
                      {formatPrice(booking?.totalAmount || calculateTotal())}
                    </span>
                  </div>
                </div>

                <button 
                  className={styles.bookBtn}
                  onClick={handleConfirmPayment}
                >
                  {icons.check(16, '#fff')} Tôi đã chuyển khoản
                </button>
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.65rem 1rem',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  color: '#92400e',
                  lineHeight: 1.5,
                  textAlign: 'center'
                }}>
                  ⚠️ Đơn hàng <strong>#{booking?.orderId}</strong> đã được tạo và đang chờ xác nhận thanh toán. Vui lòng hoàn tất chuyển khoản trước khi đóng cửa sổ này.
                </div>
              </div>
            )}

            {bookingStep === 'success' && (
              <div className={styles.paymentContent}>
                <div className={styles.successMessage}>
                  <div className={styles.successIcon}>✓</div>
                  <h3>Đặt vé thành công!</h3>
                  <p>Vé của bạn đã được gửi đến email. Hãy kiểm tra để nhận thông tin chi tiết.</p>
                </div>
                <Link href="/my-tickets" className={styles.bookBtn} onClick={closeBookingModal}>
                  Xem vé của tôi
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⭐ Reviews Section */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>⭐ Đánh giá sự kiện</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{reviewStats.averageRating}</span>
              <div>
                <StarRating rating={Math.round(reviewStats.averageRating)} />
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{reviewStats.totalCount} đánh giá</span>
              </div>
            </div>
          </div>

          {/* Review Form */}
          {isLoggedIn() && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Viết đánh giá của bạn</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Đánh giá:</span>
                <StarRating rating={myRating} interactive onRate={setMyRating} />
                {myRating > 0 && <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>{myRating}/5</span>}
              </div>
              <textarea
                value={myComment} onChange={e => setMyComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn về sự kiện..."
                rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                {reviewMsg && <span style={{ fontSize: '0.85rem', color: reviewMsg.includes('✅') ? '#10b981' : '#ef4444' }}>{reviewMsg}</span>}
                <button onClick={submitReview} disabled={reviewSubmitting} style={{
                  padding: '0.6rem 1.5rem', background: 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', marginLeft: 'auto',
                  opacity: reviewSubmitting ? 0.6 : 1
                }}>
                  {reviewSubmitting ? 'Đang gửi...' : '📝 Gửi đánh giá'}
                </button>
              </div>
            </div>
          )}

          {/* Review List */}
          {reviews.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>Chưa có đánh giá nào. Hãy là người đầu tiên! 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                    {r.userName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{r.userName}</strong>
                      <StarRating rating={r.rating} />
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {r.comment && <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.5, margin: 0 }}>{r.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🗺️ Google Maps */}
      {event?.location && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 2rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🗺️ Bản đồ địa điểm</h3>
            </div>
            <iframe
              width="100%" height="300" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed&z=15`}
            />
          </div>
        </div>
      )}

      {/* 🔗 Related Events */}
      {relatedEvents.length > 0 && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 2rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🔗 Sự kiện liên quan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {relatedEvents.map(re => (
                <Link key={re.id} href={`/events/${re.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden',
                    transition: 'all 0.2s', cursor: 'pointer'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{
                      height: 120, background: re.imageUrl ? `url(http://localhost:8080${re.imageUrl}) center/cover` : 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {!re.imageUrl && <span style={{ fontSize: '2rem', opacity: 0.5 }}>🎪</span>}
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#00B46E', fontWeight: 600, marginBottom: '0.3rem' }}>{re.category?.name || 'Sự kiện'}</div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 0.4rem', lineHeight: 1.3 }}>{re.title}</h4>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                        📅 {new Date(re.startTime).toLocaleDateString('vi-VN')} • 📍 {re.location || 'TBD'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
