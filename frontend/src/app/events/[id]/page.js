'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn } from '@/lib/api';
import { icons } from '@/components/Icons';
import styles from './event-detail.module.css';
import SeatMap from '@/components/SeatMap';
import { useTranslation } from '@/context/TranslationContext';

export default function EventDetailPage({ params }) {
  const { id } = React.use(params);
  const { t } = useTranslation();
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
  const [payOSData, setPayOSData] = useState(null);
  const [payOSLoading, setPayOSLoading] = useState(false);

  useEffect(() => {
    loadEvent();
    loadReviews();
    loadRelatedEvents();

    const handleMessage = (event) => {
      if (event.data?.type === 'PAYOS_REDIRECT') {
        if (event.data.status === 'success') {
          setBookingStep('success');
        } else if (event.data.status === 'cancel') {
          setError('Thanh toán đã bị hủy hoặc chưa hoàn tất.');
          setBookingStep('select');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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

  // Poll payment status automatically
  useEffect(() => {
    let intervalId;
    if (bookingStep === 'payment' && booking?.allOrderIds?.length > 0) {
      // We poll the last order ID since that's the one PayOS uses
      const lastOrderId = booking.allOrderIds[booking.allOrderIds.length - 1];
      intervalId = setInterval(async () => {
        try {
          const res = await apiRequest(`/orders/${lastOrderId}/status`);
          if (res.success && res.data?.status === 'PAID') {
            setBookingStep('success');
            clearInterval(intervalId);
          }
        } catch (e) {}
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [bookingStep, booking]);

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
        setError(t('events.no_events_found'));
      }
    } catch (err) {
      setError(t('common.error_connect'));
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
    if (myRating === 0) { setReviewMsg(t('events.review_rating_label')); return; }
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    setReviewSubmitting(true);
    setReviewMsg('');
    try {
      const res = await apiRequest(`/events/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: myRating, comment: myComment })
      });
      if (res.success) {
        setReviewMsg('✅ ' + t('events.review_success'));
        setMyRating(0);
        setMyComment('');
        loadReviews();
      } else {
        setReviewMsg(res.message || t('common.error_connect'));
      }
    } catch (e) { setReviewMsg(t('common.error_connect')); }
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

        // Gọi API tạo link thanh toán PayOS
        setPayOSLoading(true);
        try {
          const payOSRes = await apiRequest('/payments/create-payos-link', {
            method: 'POST',
            body: JSON.stringify({ orderId: lastResponse.orderId }),
          });
          if (payOSRes.success && payOSRes.data) {
            setPayOSData(payOSRes.data);
          } else {
            setError(payOSRes.message || 'Không thể tạo liên kết thanh toán PayOS');
          }
        } catch (err) {
          setError('Lỗi kết nối khi khởi tạo thanh toán PayOS');
        } finally {
          setPayOSLoading(false);
        }
      }
    } catch {
      setError('Lỗi kết nối server');
    }
  };

  const handleConfirmPayment = async () => {
    if (booking) {
      try {
        const orderIds = booking.allOrderIds || [booking.orderId];
        for (const orderId of orderIds) {
          await apiRequest(`/orders/${orderId}/confirm-transfer`, {
            method: 'POST'
          });
        }
      } catch (err) {
        console.error("Failed to confirm transfer:", err);
      }
    }
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

  const getBankNameByBin = (bin) => {
    const binMap = {
      '970422': 'MB Bank',
      '970415': 'VietinBank',
      '970436': 'Vietcombank',
      '970418': 'BIDV',
      '970407': 'Techcombank',
      '970405': 'Agribank',
      '970423': 'TPBank',
      '970432': 'VPBank',
      '970416': 'ACB',
    };
    return binMap[bin] || 'VietQR Partner Bank';
  };

  const openBookingModal = () => {
    setShowBookingModal(true);
    setBookingStep('select');
    setError('');
    document.body.style.overflow = 'hidden';
  };

  const closeBookingModal = async () => {
    if (bookingStep === 'select' || bookingStep === 'confirm') {
      // Release locked seats
      for (const [typeId, seatIds] of Object.entries(selectedSeatIds)) {
        if (seatIds && seatIds.length > 0) {
          try {
            await apiRequest('/seats/unlock', {
              method: 'POST',
              body: JSON.stringify({ seatIds })
            });
          } catch (e) {
            console.error("Failed to unlock seats on modal close:", e);
          }
        }
      }
    }

    // Clear selection state
    setSelectedTickets({});
    setSelectedSeatIds({});
    setSelectedSeatObjects({});
    setVoucherResult(null);
    setVoucherCode('');

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
            <p>{t('common.loading')}</p>
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
            <p>🎉 {t('events.no_events_found')}</p>
            <Link href="/events" className="btn btn-primary">{t('common.back')}</Link>
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
            ← {t('common.back')}
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
                    {icons.mapPin(16, '#666')} {event.location || t('common.contact')}
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
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert(t('events.share_success')); }}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', background: '#f8f9fa', color: '#333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Copy link
                </button>
              </div>
            </div>

            {/* Event Stats */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{t('events.detail_organizer')}</span>
                <span className={styles.statValue}>{event.organizer || 'N/A'}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{t('events.detail_category')}</span>
                <span className={styles.statValue}>{event.category?.name || 'Other'}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{t('events.detail_status')}</span>
                <span className={styles.statValue}>
                  {(() => {
                    const now = new Date();
                    const start = new Date(event.startTime);
                    const end = new Date(event.endTime);
                    if (event.status === 'CANCELLED') return t('events.status_cancelled');
                    if (now < start) return t('events.status_upcoming');
                    if (now >= start && now <= end) return t('events.status_ongoing');
                    return t('events.status_completed');
                  })()}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className={styles.section}>
              <h2>{t('events.detail_desc_title')}</h2>
              <div className={styles.description}>
                {event.description || t('events.detail_no_desc')}
              </div>
            </div>

            {/* Event Details */}
            <div className={styles.section}>
              <h2>{t('events.detail_info_title')}</h2>
              <div className={styles.details}>
                <div className={styles.detailItem}>
                  <strong>{t('events.detail_start')}:</strong>
                  <p>{new Date(event.startTime).toLocaleString('vi-VN')}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>{t('events.detail_end')}:</strong>
                  <p>{new Date(event.endTime).toLocaleString('vi-VN')}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>{t('events.detail_tickets')}:</strong>
                  <p>{event.quantities || t('events.detail_no_desc')}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>{t('events.detail_start_point')}:</strong>
                  <p>{event.startPoint || 'N/A'}</p>
                </div>
              </div>
            </div>


          </div>

          {/* Sidebar - Simplified: Only Book Now + Countdown + Share */}
          <aside className={styles.sidebar}>
            {/* Book Now Card */}
            <div className={styles.bookingCard}>
              <h2 className={styles.bookingTitle}>🎫 {t('events.booking_title')}</h2>
              <p style={{ fontSize: '0.88rem', color: '#4a5568', marginBottom: '1rem', lineHeight: 1.6 }}>
                {t('events.booking_desc')}
              </p>
              {ticketTypes.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.3rem' }}>
                    <span>{t('events.booking_price_from')}</span>
                    <span>{t('events.booking_price_to')}</span>
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
                🎟️ {t('events.booking_btn')}
              </button>
            </div>

            {/* Countdown Timer */}
            {countdown.active && (
              <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem', opacity: 0.9, textAlign: 'center' }}>⏰ {t('time.starts_in')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                  {[{ v: countdown.days, l: t('time.days') }, { v: countdown.hours, l: t('time.hours') }, { v: countdown.minutes, l: t('time.minutes') }, { v: countdown.seconds, l: t('time.seconds') }].map((item, i) => (
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
              <p className={styles.shareLabel}>{t('events.share_title')}</p>
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
                <h2 className={styles.modalTitle}>🎫 {t('events.booking_modal_title').replace('{title}', event.title)}</h2>
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
                        <span className={styles.bottomBarLabel}>{t('events.booking_total_selected_seats')}</span>
                        <span className={styles.bottomBarValue}>{getTotalSeatsCount()} {t('events.detail_tickets').toLowerCase().includes('tickets') ? 'seats' : 'ghế'}</span>
                      </div>
                      <div className={styles.bottomBarStat}>
                        <span className={styles.bottomBarLabel}>{t('events.booking_selected_positions')}</span>
                        <span className={styles.bottomBarValue}>
                          {getAllSelectedSeatNames().length > 0
                            ? getAllSelectedSeatNames().join(', ')
                            : t('events.booking_no_seats_selected')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.bottomBarPayment}>
                    <div className={styles.totalSection}>
                      <span className={styles.totalLabel}>{t('events.booking_total_amount')}</span>
                      <span className={styles.totalAmount}>{formatPrice(calculateTotal())}</span>
                    </div>
                    <button
                      className={styles.paymentBtn}
                      onClick={() => { setError(''); setBookingStep('confirm'); }}
                      disabled={getTotalSeatsCount() === 0}
                    >
                      {t('events.booking_next_step')} →
                    </button>
                  </div>
                </div>
              </>
            )}

            {bookingStep === 'confirm' && (
              <div className={styles.paymentContent}>
                <h2 className={styles.bookingTitle}>📋 {t('events.booking_confirm_order')}</h2>

                {/* Event Info Summary */}
                <div className={styles.confirmEventInfo}>
                  <div className={styles.confirmEventRow}>
                    <span className={styles.confirmEventLabel}>🎪 {t('events.category_all') === 'All' ? 'Event' : 'Sự kiện'}</span>
                    <span className={styles.confirmEventValue}>{event.title}</span>
                  </div>
                  <div className={styles.confirmEventRow}>
                    <span className={styles.confirmEventLabel}>📍 {t('home.search_placeholder_location')}</span>
                    <span className={styles.confirmEventValue}>{event.location || 'N/A'}</span>
                  </div>
                  <div className={styles.confirmEventRow}>
                    <span className={styles.confirmEventLabel}>📅 {t('events.time_label')}</span>
                    <span className={styles.confirmEventValue}>{formatDate(event.startTime)} - {formatTime(event.startTime)}</span>
                  </div>
                </div>

                {/* Ticket Details */}
                <div className={styles.confirmOrderSummary}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>🎫 {t('events.booking_detail_seats')}</p>
                  {Object.entries(selectedTickets).map(([typeId, qty]) => {
                    const ticket = ticketTypes.find(t => t.id == typeId);
                    const seatObjs = selectedSeatObjects[typeId] || [];
                    const seatNames = seatObjs.map(s => s.name).sort();
                    return (
                      <div key={typeId} className={styles.confirmOrderItem}>
                        <div style={{ flex: 1 }}>
                          <p className={styles.confirmItemName}>{ticket?.name || 'Vé'}</p>
                          <p className={styles.confirmItemMeta}>{t('events.detail_tickets')}: {qty} × {formatPrice(ticket?.price || 0)}</p>
                          {seatNames.length > 0 && (
                            <div className={styles.confirmSeatTags}>
                              <span style={{ fontSize: '0.78rem', color: '#6b7280', marginRight: '0.4rem' }}>{t('events.detail_tickets').toLowerCase().includes('tickets') ? 'Seats:' : 'Ghế:'}</span>
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
                  <p className={styles.confirmVoucherLabel}>🏷   {t('events.voucher_label')}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder={t('events.voucher_placeholder')}
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
                        } catch { setVoucherResult({ success: false, message: t('common.error_connect') }); }
                        finally { setVoucherLoading(false); }
                      }}
                      disabled={voucherLoading || !voucherCode.trim()}
                      className={styles.voucherApplyBtn}
                    >
                      {voucherLoading ? '...' : t('events.voucher_apply')}
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
                    <span>{t('events.booking_total_amount')}:</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(calculateTotal())}</span>
                  </div>
                  {voucherResult?.success && (
                    <div className={styles.confirmPriceRow} style={{ color: '#16a34a' }}>
                      <span>{t('events.voucher_label')}:</span>
                      <span style={{ fontWeight: 600 }}>-{formatPrice(voucherResult.discount)}</span>
                    </div>
                  )}
                  <div className={styles.confirmPriceTotal}>
                    <span>{t('events.booking_final_total')}:</span>
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
                  {t('events.booking_confirm_pay')}
                </button>
                <button
                  className={styles.backBtnSmall}
                  onClick={() => setBookingStep('select')}
                >
                  ← {t('events.booking_back_select_seats')}
                </button>
              </div>
            )}

            {bookingStep === 'payment' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0, minHeight: '650px' }}>
                <style>{`
                  @media (min-width: 768px) {
                    .paymentGrid { grid-template-columns: 1.2fr 420px !important; }
                  }
                `}</style>
                <div className="paymentGrid" style={{ display: 'grid', gridTemplateColumns: '1fr', background: '#fff' }}>
                  
                  {/* Left Column: Order Summary */}
                  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRight: '1px solid #f1f5f9' }}>
                    <div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: '#e0e7ff', color: '#4f46e5', width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✓</span>
                        {t('events.category_all') === 'All' ? 'Order Confirmed' : 'Đơn hàng đã tạo'}
                      </h3>
                      <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {t('events.category_all') === 'All' 
                          ? 'Please complete the payment using the QR code. The system will automatically confirm your tickets.'
                          : 'Vui lòng hoàn tất thanh toán qua mã QR. Hệ thống sẽ tự động xác nhận và gửi vé cho bạn.'}
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Mã đơn hàng</span>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: '1.1rem' }}>#{booking?.orderId}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Sự kiện</span>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>{event.title}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Số lượng vé</span>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{getTotalSeatsCount()} vé</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '2px solid #e2e8f0', alignItems: 'flex-end' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Tổng thanh toán</span>
                        <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.6rem', lineHeight: 1 }}>{formatPrice(calculateTotal())}</span>
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: 'auto', 
                      background: 'linear-gradient(to right, #ecfdf5, #f0fdf4)', 
                      borderRadius: '12px', 
                      padding: '1.25rem', 
                      border: '1px solid #a7f3d0',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{ background: '#10b981', color: '#fff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: 'bold' }}>i</div>
                      <p style={{ color: '#065f46', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                        Trang web đang chờ tín hiệu thanh toán. Vui lòng giữ nguyên màn hình này sau khi quét QR, màn hình sẽ tự động chuyển khi nhận được tiền.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: PayOS iframe */}
                  <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {payOSLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem' }}>
                        <div className="spinner" style={{ width: 40, height: 40 }}></div>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '15px' }}>Đang kết nối cổng thanh toán...</p>
                      </div>
                    ) : payOSData ? (
                      <iframe
                        src={payOSData.checkoutUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 'none', minHeight: '650px', display: 'block' }}
                        title="PayOS Checkout"
                        allow="clipboard-write"
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', padding: '2rem', textAlign: 'center' }}>
                        ❌ Không thể tải thông tin thanh toán. Vui lòng thử lại.
                      </div>
                    )}
                    
                    {error && (
                      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid #fca5a5', zIndex: 10 }}>
                        {error}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {bookingStep === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: '#fff', textAlign: 'center', minHeight: '500px' }}>
                
                {/* CSS Confetti Effect built-in */}
                <style>{`
                  @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                  @keyframes floatUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
                `}</style>
                
                <div style={{ 
                  width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '3rem', 
                  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', marginBottom: '2rem', animation: 'popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' 
                }}>
                  ✓
                </div>
                
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', animation: 'floatUp 0.6s ease forwards 0.2s', opacity: 0 }}>
                  Thanh toán thành công!
                </h2>
                
                <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '400px', lineHeight: 1.6, marginBottom: '2.5rem', animation: 'floatUp 0.6s ease forwards 0.4s', opacity: 0 }}>
                  Đơn hàng <strong>#{booking?.orderId}</strong> của bạn đã được xác nhận. Chúc bạn có một trải nghiệm tuyệt vời tại sự kiện!
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', animation: 'floatUp 0.6s ease forwards 0.6s', opacity: 0 }}>
                  <Link href="/my-tickets" onClick={closeBookingModal} style={{ 
                    padding: '14px 28px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', 
                    borderRadius: '12px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3)', transition: 'transform 0.2s' 
                  }}>
                    🎟️ Xem vé của tôi
                  </Link>
                  <button onClick={closeBookingModal} style={{ 
                    padding: '14px 28px', background: '#f1f5f9', color: '#334155', border: 'none', 
                    borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' 
                  }}>
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⭐ Reviews Section */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>⭐ {t('events.review_title')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{reviewStats.averageRating}</span>
              <div>
                <StarRating rating={Math.round(reviewStats.averageRating)} />
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{reviewStats.totalCount} {t('events.category_all') === 'All' ? 'reviews' : 'đánh giá'}</span>
              </div>
            </div>
          </div>

          {/* Review Form */}
          {isLoggedIn() && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>{t('events.review_write_title')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{t('events.review_rating_label')}</span>
                <StarRating rating={myRating} interactive onRate={setMyRating} />
                {myRating > 0 && <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>{myRating}/5</span>}
              </div>
              <textarea
                value={myComment} onChange={e => setMyComment(e.target.value)}
                placeholder={t('events.review_comment_placeholder')}
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
                  {reviewSubmitting ? t('events.review_submitting') : '📝 ' + t('events.review_submit_btn')}
                </button>
              </div>
            </div>
          )}

          {/* Review List */}
          {reviews.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>{t('events.review_no_reviews')}</p>
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🗺️ {t('events.category_all') === 'All' ? 'Location Map' : 'Bản đồ địa điểm'}</h3>
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🔗 {t('events.category_all') === 'All' ? 'Related Events' : 'Sự kiện liên quan'}</h3>
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
