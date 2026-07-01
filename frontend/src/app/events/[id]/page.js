'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn } from '@/lib/api';
import { icons } from '@/components/Icons';
import styles from './event-detail.module.css';
import { format, parseISO } from 'date-fns';
import SeatMap from '@/components/SeatMap';
import { useTranslation } from '@/context/TranslationContext';
import { useRouter } from 'next/navigation';
import SplitPaymentModal from '@/components/SplitPaymentModal';

export default function EventDetailPage({ params }) {
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;
  const { t } = useTranslation();
  const router = useRouter();
  const seatMapRef = useRef(null);
  const [event, setEvent] = useState(null);
  
  // Split payment modal state
  const [isSplitPaymentModalOpen, setSplitPaymentModalOpen] = useState(false);
  const [currentSplitOrderId, setCurrentSplitOrderId] = useState(null);
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
  const [canReview, setCanReview] = useState(false);
  const [reviewReasonMessage, setReviewReasonMessage] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, active: false });
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [payOSData, setPayOSData] = useState(null);
  const [payOSLoading, setPayOSLoading] = useState(false);
  const [paymentTimeLeft, setPaymentTimeLeft] = useState(600); // 10 phút
  const [seatLockStartTime, setSeatLockStartTime] = useState(null);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [showVouchersDropdown, setShowVouchersDropdown] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(10); // Mặc định 10 phút

  const [selectedDate, setSelectedDate] = useState(null);
  const calendarRef = useRef(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarViewMode, setCalendarViewMode] = useState('calendar');
  const [expandedDates, setExpandedDates] = useState([]);

  const uniqueDates = [...new Set(ticketTypes.map(t => t.eventDate).filter(Boolean))].sort();
  const filteredTicketTypes = uniqueDates.length > 0 && selectedDate 
    ? ticketTypes.filter(t => t.eventDate === selectedDate)
    : ticketTypes;

  useEffect(() => {
    loadConfig();
    loadEvent();
    loadReviews();
    loadRelatedEvents();
    loadActiveVouchers();

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

  useEffect(() => {
    if (event?.organizerId && isLoggedIn()) {
      apiRequest(`/organizers/${event.organizerId}/is-following`)
        .then(res => { if (res.success) setIsFollowing(res.data.followed); })
        .catch(err => console.error(err));
    }
  }, [event?.organizerId]);

  useEffect(() => {
    if (event) {
      if (isLoggedIn()) {
        apiRequest('/tickets')
          .then(res => {
            if (res.success) {
              const tickets = res.data || [];
              const now = new Date();
              const endTime = new Date(event.endTime);
              if (now < endTime) {
                setCanReview(false);
                setReviewReasonMessage('Bạn chỉ có thể đánh giá sau khi sự kiện kết thúc.');
              } else {
                const hasUsedTicket = tickets.some(t => t.eventId === event.id && t.checkinStatus === 'USED');
                if (hasUsedTicket) {
                  setCanReview(true);
                } else {
                  setCanReview(false);
                  setReviewReasonMessage('Bạn chỉ có thể đánh giá sự kiện khi đã mua vé và check-in tham gia thành công.');
                }
              }
            }
          })
          .catch(() => {
            setCanReview(false);
            setReviewReasonMessage('Lỗi tải dữ liệu kiểm tra quyền đánh giá.');
          });
      } else {
        setCanReview(false);
        setReviewReasonMessage('Vui lòng đăng nhập để viết đánh giá.');
      }
    }
  }, [event]);

  const handleFollowToggle = async () => {
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    if (!event?.organizerId) return;
    setFollowLoading(true);
    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      const res = await apiRequest(`/organizers/${event.organizerId}/${action}`, { method: 'POST' });
      if (res.success) {
        setIsFollowing(res.data.followed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowLoading(false);
    }
  };

  const refreshPaymentQR = async () => {
    try {
      const payOSRes = await apiRequest('/payments/create-payos-link', {
        method: 'POST',
        body: JSON.stringify({ orderIds: booking.allOrderIds }),
      });
      if (payOSRes.success && payOSRes.data) {
        setPaymentUrl(payOSRes.data.checkoutUrl);
        setSeatLockStartTime(Date.now());
      }
    } catch (e) {
      console.error('Lỗi khi làm mới mã QR', e);
    }
  };

  useEffect(() => {
    let timer;
    if (bookingStep === 'payment' && seatLockStartTime) {
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - seatLockStartTime) / 1000);
        const timeoutSeconds = timeoutMinutes * 60;
        const remaining = Math.max(0, timeoutSeconds - elapsed);
        setPaymentTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
          refreshPaymentQR();
          setError(`Đã hết thời gian thanh toán (${timeoutMinutes} phút). Vui lòng tải lại trang và đặt vé lại để đảm bảo tính hợp lệ của giao dịch.`);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [bookingStep, seatLockStartTime, timeoutMinutes, booking?.allOrderIds]);

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

  const loadActiveVouchers = async () => {
    try {
      const res = await apiRequest('/vouchers/active');
      if (res.success) {
        setAvailableVouchers(res.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch vouchers", e);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await apiRequest('/config/payment-timeout');
      if (res.success && res.data?.timeoutMinutes) {
        setTimeoutMinutes(res.data.timeoutMinutes);
        setPaymentTimeLeft(res.data.timeoutMinutes * 60);
      }
    } catch (e) {
      console.error("Failed to fetch config", e);
    }
  };

  const loadEvent = async () => {
    try {
      const res = await apiRequest(`/events/${id}`);
      if (res.success) {
        setEvent(res.data);
        const tTypes = res.data.ticketTypes || [];
        setTicketTypes(tTypes);
        // Set first ticket type as active by default
        if (tTypes.length > 0) {
          setActiveTicketTypeId(tTypes[0].id);
          const uDates = [...new Set(tTypes.map(t => t.eventDate).filter(Boolean))].sort();
          if (uDates.length > 0) {
            const d = new Date(uDates[0]);
            setCalendarMonth(d.getMonth());
            setCalendarYear(d.getFullYear());
          }
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
      const seats = selectedSeatObjects[typeId];
      if (seats && seats.length > 0) {
        return sum + seats.reduce((s, seat) => s + (seat.price || ticketType?.price || 0), 0);
      }
      return sum + (ticketType?.price || 0) * qty;
    }, 0);
  };

  const getTotalSeatsCount = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getAllSelectedSeatNames = () => {
    const allNames = [];
    Object.entries(selectedSeatObjects).forEach(([typeId, seatObjects]) => {
      if (seatObjects && seatObjects.length > 0) {
        const ticketType = ticketTypes.find(t => t.id == typeId);
        const typeName = ticketType?.name || 'Vé';
        const seatNames = seatObjects.map(s => s.name).join(', ');
        allNames.push(`${typeName}: ${seatNames}`);
      }
    });
    return allNames;
  };

  const handleSplitPaymentBooking = async () => {
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
      const validEntries = Object.entries(selectedTickets).filter(([_, q]) => q > 0);
      if (validEntries.length === 0) return;
      
      if (validEntries.length > 1) {
        setError('Tính năng thanh toán chia nhóm hiện tại chỉ hỗ trợ chia sẻ cho 1 loại vé. Vui lòng chọn mua từng loại vé riêng biệt.');
        return;
      }
      
      const typeId = validEntries[0][0];
      const qty = validEntries[0][1];
      
      const bookingBody = {
        ticketTypeId: parseInt(typeId),
        quantity: qty,
        seatIds: selectedSeatIds[typeId] || []
      };
      if (voucherResult?.success && voucherCode.trim()) {
        bookingBody.voucherCode = voucherCode.trim();
      }
      
      const res = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingBody),
      });
      
      if (res.success) {
        const orderId = res.data.orderId;
        const splitRes = await apiRequest(`/split-payment/create/${orderId}`, {
          method: 'POST'
        });
        
        if (splitRes.success) {
          setCurrentSplitOrderId(orderId);
          setShowBookingModal(false);
          document.body.style.overflow = '';
          setSplitPaymentModalOpen(true);
        } else {
          setError(splitRes.message || 'Lỗi khi tạo chia sẻ thanh toán');
        }
      } else {
        setError(res.message || 'Đặt vé thất bại');
      }
    } catch {
      setError('Lỗi kết nối server');
    }
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
        setSeatLockStartTime(Date.now());

        // Gọi API tạo link thanh toán PayOS
        setPayOSLoading(true);
        try {
          const payOSRes = await apiRequest('/payments/create-payos-link', {
            method: 'POST',
            body: JSON.stringify({ orderIds: allOrderIds }),
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

  const openBookingModal = (forceDate = null) => {
    const targetDate = forceDate || selectedDate;
    
    if (!isLoggedIn()) {
      setShowLoginPrompt(true);
      return;
    }
    if (uniqueDates.length > 1 && !targetDate) {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    if (uniqueDates.length === 1 && !targetDate) {
      setSelectedDate(uniqueDates[0]);
    } else if (forceDate) {
      setSelectedDate(forceDate);
    }

    setShowBookingModal(true);
    setBookingStep('select');
    setSeatLockStartTime(null);
    setError('');
    setSelectedTickets({});
    setSelectedSeatIds({});
    setSelectedSeatObjects({});
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
            <p>{t('events.no_events_found')}</p>
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
        <div className={styles.heroBanner} style={{ position: 'relative', height: '380px', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {event.imageUrl ? (
            <>
              {/* Blurred Background Layer */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(http://localhost:8080${event.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(30px) brightness(0.4)',
                  transform: 'scale(1.15)',
                  zIndex: 1
                }}
              />
              {/* Sharp Foreground Cover */}
              <div 
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  padding: '20px'
                }}
              >
                <img 
                  src={`http://localhost:8080${event.imageUrl}`} 
                  alt={event.title}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '1200px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    borderRadius: '16px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.6)'
                  }}
                />
              </div>
            </>
          ) : (
            /* Premium fall-back gradient with overlay graphics */
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}
            >
              <div style={{ textAlign: 'center', color: '#fff', padding: '2rem' }}>
                <span style={{ fontSize: '3.5rem', opacity: 0.9, display: 'block', marginBottom: '10px' }}>🎫</span>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {event.category?.name || 'Sự kiện'}
                </span>
              </div>
            </div>
          )}
          
          <Link href="/events" className={styles.backBtn} style={{ zIndex: 10 }}>
            ← {t('common.back')}
          </Link>
          <button onClick={toggleFavorite} style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.95)',
            border: 'none', borderRadius: '20px', padding: '8px 16px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'transform 0.2s',
            fontWeight: 700, fontSize: '0.82rem', color: isFavorited ? '#e91e63' : '#334155',
            zIndex: 10
          }}>
            {isFavorited ? 'Đã thích' : 'Yêu thích'}
          </button>
        </div>

        <div className={styles.content}>
          {/* Main Section */}
          <div className={styles.mainSection}>
            {/* Event Header */}
            <div className={styles.eventHeader} style={{ display: 'block', padding: '2rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '6px 14px', borderRadius: '30px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                {event.category?.name || 'Sự kiện'}
              </div>
              <h1 className={styles.title} style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: '1.25', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                {event.title}
              </h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                {/* Time row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ background: '#eff6ff', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#3b82f6' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thời gian</span>
                    <span style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                      {formatDate(event.startTime)} {formatTime(event.startTime)}
                    </span>
                  </div>
                </div>

                {/* Location row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ background: '#ecfdf5', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#10b981' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Địa điểm</span>
                    <span style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginTop: '2px', lineHeight: 1.4 }}>
                      {event.location || t('common.contact')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Stats */}
            <div className={styles.stats}>
              <div className={styles.statItem} style={{ display: 'flex', flexDirection: 'column', borderTop: '4px solid #8b5cf6', alignItems: 'center' }}>
                <span className={styles.statLabel}>{t('events.detail_organizer')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', justifyContent: 'center' }}>
                  <span className={styles.statValue} style={{ margin: 0 }}>{event.organizerName || 'N/A'}</span>
                  {event.organizerId && (
                    <button 
                      onClick={handleFollowToggle} 
                      disabled={followLoading}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: isFollowing ? '1px solid #d1d5db' : 'none',
                        background: isFollowing ? '#f3f4f6' : '#8b5cf6',
                        color: isFollowing ? '#374151' : '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'all 0.15s'
                      }}
                    >
                      {followLoading ? '...' : isFollowing ? '✓ Đang theo' : '＋ Theo dõi'}
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.statItem} style={{ borderTop: '4px solid #3b82f6' }}>
                <span className={styles.statLabel}>{t('events.detail_category')}</span>
                <span className={styles.statValue} style={{ color: '#3b82f6' }}>{event.category?.name || 'Other'}</span>
              </div>
              {(() => {
                const now = new Date();
                const start = new Date(event.startTime);
                const end = new Date(event.endTime);
                let statusText = t('events.status_completed');
                let color = '#64748b'; // default completed
                if (event.status === 'CANCELLED') {
                  statusText = t('events.status_cancelled');
                  color = '#ef4444';
                } else if (now < start) {
                  statusText = t('events.status_upcoming');
                  color = '#10b981';
                } else if (now >= start && now <= end) {
                  statusText = t('events.status_ongoing');
                  color = '#f59e0b';
                }
                return (
                  <div className={styles.statItem} style={{ borderTop: `4px solid ${color}` }}>
                    <span className={styles.statLabel}>{t('events.detail_status')}</span>
                    <span className={styles.statValue} style={{ color: color }}>
                      {statusText}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Combined Description & Event Details */}
            <div className={styles.section}>
              <h2>{t('events.detail_desc_title')}</h2>
              <div className={styles.description} style={{ marginBottom: '2rem' }}>
                {event.description || t('events.detail_no_desc')}
              </div>

              <h2 style={{ paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>{t('events.detail_info_title')}</h2>
              <div className={styles.details}>
                <div className={styles.detailItem}>
                  <strong>🕒 {t('events.detail_start') || 'Thời gian bắt đầu'}:</strong>
                  <p>{new Date(event.startTime).toLocaleString('vi-VN')}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>🏁 {t('events.detail_end') || 'Thời gian kết thúc'}:</strong>
                  <p>{new Date(event.endTime).toLocaleString('vi-VN')}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>📍 Địa điểm tổ chức:</strong>
                  <p>{event.location || 'Chưa cập nhật'}</p>
                </div>
                <div className={styles.detailItem}>
                  <strong>🔥 Lượt quan tâm:</strong>
                  <p>{event.views || 0} người đã xem</p>
                </div>
              </div>
            </div>

            {/* Calendar Section */}
            {uniqueDates.length > 0 && (
              <div className={styles.section} ref={calendarRef} style={{ background: '#ffffff', color: '#0f172a', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, color: '#00B46E', fontSize: '1.2rem', fontWeight: 'bold' }}>Lịch diễn</h3>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '24px', overflow: 'hidden', padding: '2px', border: '1px solid #e2e8f0' }}>
                    <button 
                      onClick={() => setCalendarViewMode('list')}
                      style={{ background: calendarViewMode === 'list' ? '#fff' : 'transparent', color: calendarViewMode === 'list' ? '#0f172a' : '#64748b', border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', boxShadow: calendarViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <button 
                      onClick={() => setCalendarViewMode('calendar')}
                      style={{ background: calendarViewMode === 'calendar' ? '#fff' : 'transparent', color: calendarViewMode === 'calendar' ? '#0f172a' : '#64748b', border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', boxShadow: calendarViewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </button>
                  </div>
                </div>

                {calendarViewMode === 'calendar' ? (
                  <>
                    {/* Month Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      <button 
                        onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); } else setCalendarMonth(m => m - 1); }} 
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', padding: '0 10px' }}>&lt;</button>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
                        {[0, 1, 2, 3, 4].map(offset => {
                          let m = calendarMonth + offset;
                          let y = calendarYear;
                          if (m > 11) { m -= 12; y += 1; }
                          const isCurrent = offset === 0;
                          const count = uniqueDates.filter(d => new Date(d).getMonth() === m && new Date(d).getFullYear() === y).length;
                          return (
                            <div key={`${m}-${y}`} onClick={() => { setCalendarMonth(m); setCalendarYear(y); }} style={{ textAlign: 'center', cursor: 'pointer', opacity: isCurrent ? 1 : 0.6, borderBottom: isCurrent ? '2px solid #00B46E' : 'none', paddingBottom: '8px', padding: '0 10px' }}>
                              <div style={{ fontWeight: isCurrent ? 'bold' : 'normal', color: isCurrent ? '#00B46E' : '#334155', fontSize: '1rem' }}>Tháng {m + 1}{isCurrent ? `, ${y}` : ''}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{count} suất diễn</div>
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); } else setCalendarMonth(m => m + 1); }} 
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', padding: '0 10px' }}>&gt;</button>
                    </div>

                    <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                      * {t('events.payment_note_1')} <strong>{timeoutMinutes} {t('events.payment_note_2')}</strong>. {t('events.payment_note_3')}
                    </p>

                    {/* Days of Week */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', color: '#475569', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                      <div>Thứ 2</div><div>Thứ 3</div><div>Thứ 4</div><div>Thứ 5</div><div>Thứ 6</div><div>Thứ 7</div><div>Chủ nhật</div>
                    </div>

                    {/* Calendar Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '15px 10px', textAlign: 'center' }}>
                      {(() => {
                        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                        const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                        const startingDay = firstDay === 0 ? 6 : firstDay - 1; 

                        return (
                          <>
                            {Array(startingDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                            
                            {Array(daysInMonth).fill(null).map((_, i) => {
                              const day = i + 1;
                              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const isAvailable = uniqueDates.includes(dateStr);
                              const isSelected = selectedDate === dateStr;
                              
                              return (
                                <div 
                                  key={day}
                                  onClick={() => { 
                                    if (isAvailable) {
                                      const ticketsForDate = ticketTypes.filter(t => t.eventDate === dateStr);
                                      if (ticketsForDate.length > 0) {
                                        setActiveTicketTypeId(ticketsForDate[0].id);
                                      }
                                      openBookingModal(dateStr);
                                    }
                                  }}
                                  style={{
                                    cursor: isAvailable ? 'pointer' : 'default',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    opacity: isAvailable ? 1 : 0.4,
                                  }}
                                >
                                  <span style={{ 
                                    fontSize: '1.1rem', 
                                    fontWeight: isAvailable ? 'bold' : 'normal', 
                                    color: isSelected ? '#fff' : '#334155',
                                    background: isSelected ? '#00B46E' : 'transparent',
                                    width: '38px',
                                    height: '38px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    boxShadow: isSelected ? '0 4px 12px rgba(0, 180, 110, 0.4)' : 'none',
                                    transition: 'all 0.2s'
                                  }}>
                                    {String(day).padStart(2, '0')}
                                  </span>
                                  {isAvailable && (
                                    <div style={{ width: '24px', height: '4px', background: '#00B46E', borderRadius: '2px', marginTop: '6px', opacity: isSelected ? 0 : 0.6 }}></div>
                                  )}
                                </div>
                              )
                            })}
                          </>
                        )
                      })()}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {uniqueDates.map(dateStr => {
                      const d = new Date(dateStr);
                      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                      const dayOfWeek = days[d.getDay()];
                      const isExpanded = expandedDates.includes(dateStr);
                      const ticketsForDate = ticketTypes.filter(t => t.eventDate === dateStr);
                      
                      const startTime = new Date(event.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                      const endTime = new Date(event.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});

                      return (
                        <div key={dateStr} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                          <div 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1rem', background: isExpanded ? '#f8fafc' : '#fff', cursor: 'pointer', transition: 'background 0.2s' }} 
                            onClick={() => setExpandedDates(prev => prev.includes(dateStr) ? prev.filter(x => x !== dateStr) : [...prev, dateStr])}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <svg width="20" height="20" fill="none" stroke="#64748b" viewBox="0 0 24 24" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                              </svg>
                              <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155' }}>{startTime} - {endTime}, {dayOfWeek}</div>
                                <div style={{ fontSize: '0.85rem', color: '#00B46E', marginTop: '4px' }}>{String(d.getDate()).padStart(2, '0')} Tháng {String(d.getMonth() + 1).padStart(2, '0')}, {d.getFullYear()}</div>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(dateStr);
                                if (ticketsForDate.length > 0) setActiveTicketTypeId(ticketsForDate[0].id);
                                openBookingModal(dateStr);
                              }}
                              style={{ background: '#00B46E', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0, 180, 110, 0.2)' }}
                            >
                              Mua vé ngay
                            </button>
                          </div>
                          
                          {isExpanded && (
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Thông tin vé</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {ticketsForDate.map(ticket => (
                                  <div key={ticket.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.2rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a' }}>{ticket.name}</span>
                                    </div>
                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#00B46E' }}>{formatPrice(ticket.price)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>


          {/* Sidebar - Simplified: Only Book Now + Countdown + Share */}
          <aside className={styles.sidebar}>
            {/* Book Now Card */}
            <div className={styles.bookingCard}>
              <h2 className={styles.bookingTitle}>Đặt vé</h2>
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
              {(() => {
                const now = new Date();
                const end = new Date(event.endTime);
                const isClosed = event.status === 'CANCELLED' || event.status === 'CLOSED' || now > end;
                return (
                  <button 
                    className={styles.bookNowBtn}
                    onClick={() => {
                      if (calendarRef.current) {
                        calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Add a little highlight effect to draw attention
                        calendarRef.current.style.transition = 'box-shadow 0.3s';
                        calendarRef.current.style.boxShadow = '0 0 0 4px rgba(0, 180, 110, 0.3)';
                        setTimeout(() => {
                          if (calendarRef.current) calendarRef.current.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
                        }, 1500);
                      }
                    }}
                    disabled={isClosed}
                    style={isClosed ? { 
                      background: '#94a3b8', 
                      cursor: 'not-allowed', 
                      boxShadow: 'none',
                      opacity: 0.8
                    } : {}}
                  >
                    {isClosed ? 'Đã kết thúc / Hủy' : 'Đặt vé ngay'}
                  </button>
                );
              })()}
            </div>

            {/* Ticket Types Information */}
            {ticketTypes && ticketTypes.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Loại vé & Giá vé</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(() => {
                    const uniqueTickets = [];
                    const seenNames = new Set();
                    ticketTypes.forEach(tt => {
                      if (!seenNames.has(tt.name)) {
                        seenNames.add(tt.name);
                        uniqueTickets.push({ 
                          ...tt, 
                          totalAgg: tt.totalQuantity ?? tt.quantity ?? 0,
                          availAgg: tt.availableQuantity ?? tt.remaining ?? 0
                        });
                      } else {
                        const existing = uniqueTickets.find(u => u.name === tt.name);
                        if (existing) {
                          existing.totalAgg += (tt.totalQuantity ?? tt.quantity ?? 0);
                          existing.availAgg += (tt.availableQuantity ?? tt.remaining ?? 0);
                        }
                      }
                    });

                    return uniqueTickets.map((ticket, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        transition: 'transform 0.15s'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{ticket.name}</span>
                            <span style={{ background: ticket.availAgg > 0 ? '#ecfdf5' : '#fef2f2', color: ticket.availAgg > 0 ? '#059669' : '#dc2626', padding: '2px 6px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700 }}>
                              {ticket.availAgg > 0 ? `Còn ${ticket.availAgg}` : 'Hết'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                            Tổng số lượng: {ticket.totalAgg}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                            {formatPrice(ticket.price)}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Countdown Timer */}
            {countdown.active && (
              <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem', opacity: 0.9, textAlign: 'center' }}>Thời gian còn lại</p>
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
                <h2 className={styles.modalTitle}>Đặt vé: {event.title}</h2>
                <p className={styles.modalSubtitle}>
                  Địa điểm: {event.location} • Thời gian: {formatDate(event.startTime)}
                </p>
              </div>
              <button className={styles.modalCloseBtn} onClick={closeBookingModal}>✕</button>
            </div>

            {bookingStep === 'select' && (
              <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'row' }}>
                {/* Left Pane: Seat Map */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid #e2e8f0' }}>
                  {/* Ticket Type Tabs */}
                  <div className={styles.ticketTypeTabs}>
                    {filteredTicketTypes.map(ticket => (
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
                    {activeTicketTypeId ? (
                      <>
                        <SeatMap
                          ref={seatMapRef}
                          key={activeTicketTypeId}
                          ticketTypeId={activeTicketTypeId}
                          initialSelectedSeats={selectedSeatIds[activeTicketTypeId] || []}
                          onSeatsSelected={(seats, seatObjects) => handleSeatsSelected(activeTicketTypeId, seats, seatObjects)}
                        />
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        Vui lòng chọn loại vé để xem sơ đồ ghế
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Pane: Selected Tickets Summary */}
                <div style={{ width: '320px', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0 1.5rem', height: '72px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Thông tin vé đã chọn</h3>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {Object.keys(selectedTickets).length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                        <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p style={{ fontSize: '0.88rem' }}>Chưa có vé nào được chọn</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {Object.entries(selectedTickets).map(([typeId, qty]) => {
                          const tt = filteredTicketTypes.find(t => t.id == typeId);
                          if (!tt) return null;
                          return (
                            <div key={typeId} style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>{tt.name}</span>
                                <span style={{ fontWeight: 700, color: '#00B46E' }}>{qty}x</span>
                              </div>
                              
                              {/* Hiển thị danh sách ghế đã chọn cho loại vé này */}
                              {selectedSeatObjects[typeId] && selectedSeatObjects[typeId].length > 0 && (
                                <div style={{ marginBottom: '8px', fontSize: '0.8rem', color: '#4a5568' }}>
                                  <strong>Ghế: </strong> 
                                  {selectedSeatObjects[typeId].map(s => s.name).join(', ')}
                                </div>
                              )}
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thành tiền:</span>
                                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatPrice(tt.price * qty)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '1.5rem', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.88rem', color: '#64748b' }}>
                      <span>Tổng cộng</span>
                      <span>{getTotalSeatsCount()} vé</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>Tạm tính</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{formatPrice(calculateTotal())}</span>
                    </div>
                    <button 
                      className={`${styles.btn} ${styles.btnPrimary}`} 
                      style={{ width: '100%', padding: '14px', fontSize: '1.05rem', background: 'linear-gradient(135deg, #00B46E 0%, #00A060 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 180, 110, 0.2)' }}
                      onClick={() => {
                        if (getTotalSeatsCount() === 0) {
                          setError('Vui lòng chọn ít nhất 1 vé để tiếp tục');
                          return;
                        }
                        setError('');
                        setBookingStep('confirm');
                      }}
                    >
                      Tiếp tục
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bookingStep === 'confirm' && (
              <div className={styles.paymentContent}>
                <h2 className={styles.bookingTitle}>Xác nhận đặt vé</h2>
 
                 {/* Event Info Summary */}
                 <div className={styles.confirmEventInfo}>
                   <div className={styles.confirmEventRow}>
                     <span className={styles.confirmEventLabel}>{t('events.category_all') === 'All' ? 'Event' : 'Sự kiện'}</span>
                     <span className={styles.confirmEventValue}>{event.title}</span>
                   </div>
                   <div className={styles.confirmEventRow}>
                     <span className={styles.confirmEventLabel}>{t('home.search_placeholder_location')}</span>
                     <span className={styles.confirmEventValue}>{event.location || 'N/A'}</span>
                   </div>
                   <div className={styles.confirmEventRow}>
                     <span className={styles.confirmEventLabel}>{t('events.time_label')}</span>
                     <span className={styles.confirmEventValue}>{formatDate(event.startTime)} - {formatTime(event.startTime)}</span>
                   </div>
                 </div>
 
                 {/* Ticket Details */}
                 <div className={styles.confirmOrderSummary}>
                   <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Chi tiết vé</p>
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
                            <div className={styles.summaryItem}>
                              <span className={styles.summaryLabel}>Ngày áp dụng</span>
                              <span className={styles.summaryValue}>{selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN') : 'Mặc định'}</span>
                            </div>
                          )}
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
                <div className={styles.confirmVoucherSection} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className={styles.confirmVoucherLabel}>{t('events.voucher_label')}</p>
                    {availableVouchers.length > 0 && (
                      <span 
                        style={{ fontSize: '0.8rem', color: '#00B46E', cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={() => setShowVouchersDropdown(!showVouchersDropdown)}
                      >
                        {showVouchersDropdown ? 'Ẩn mã' : 'Xem mã khả dụng'}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={t('events.voucher_placeholder')}
                      value={voucherCode}
                      onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setVoucherResult(null); }}
                      onFocus={() => setShowVouchersDropdown(true)}
                      className={styles.voucherInput}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={async () => {
                        if (!voucherCode.trim()) return;
                        setVoucherLoading(true);
                        setShowVouchersDropdown(false);
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
                  
                  {/* Dropdown mã giảm giá khả dụng */}
                  {showVouchersDropdown && availableVouchers.length > 0 && (
                    <div style={{ 
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto'
                    }}>
                      {availableVouchers.map(v => (
                        <div 
                          key={v.code} 
                          onClick={() => {
                            setVoucherCode(v.code);
                            setShowVouchersDropdown(false);
                            setVoucherResult(null);
                          }}
                          style={{ 
                            padding: '12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                            transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{v.code}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{v.description}</div>
                          </div>
                          <button style={{ 
                            background: '#eff6ff', color: '#3b82f6', border: 'none', 
                            padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' 
                          }}>
                            Chọn
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

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

                {getTotalSeatsCount() > 1 && (
                  <button
                    className={styles.bookBtn}
                    style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', marginBottom: '10px' }}
                    onClick={async () => {
                      await handleSplitPaymentBooking();
                    }}
                  >
                    🤝 Thanh toán chia nhóm (Split Payment)
                  </button>
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
                  onClick={() => {
                    setBookingStep('select');
                    setSeatLockStartTime(null);
                  }}
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

                    {/* Hiển thị thời gian đếm ngược (Màu đỏ, Nằm ngoài hộp xám) */}
                    <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                        Mã QR sẽ làm mới sau: <span style={{ fontSize: '1.2rem', color: '#dc2626' }}>{Math.floor(paymentTimeLeft / 60).toString().padStart(2, '0')}:{(paymentTimeLeft % 60).toString().padStart(2, '0')}</span>
                      </span>
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
                    Xem vé của tôi
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

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className={styles.bookingModalOverlay} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowLoginPrompt(false)}>
          <div className={styles.bookingModal} style={{ width: '90%', maxWidth: '400px', padding: '2.5rem 2rem', textAlign: 'center', borderRadius: '24px', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transform: 'translateY(0)', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '64px', height: '64px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg width="32" height="32" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4"></path>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Yêu cầu đăng nhập</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              Bạn cần đăng nhập tài khoản để có thể tiếp tục thao tác mua vé và giữ chỗ cho sự kiện này.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowLoginPrompt(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#00B46E', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px 0 rgba(0, 180, 110, 0.39)' }}
                onMouseOver={e => { e.currentTarget.style.background = '#00965A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#00B46E'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ Reviews Section */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{t('events.review_title')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{reviewStats.averageRating}</span>
              <div>
                <StarRating rating={Math.round(reviewStats.averageRating)} />
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{reviewStats.totalCount} {t('events.category_all') === 'All' ? 'reviews' : 'đánh giá'}</span>
              </div>
            </div>
          </div>

          {/* Review Form */}
          {isLoggedIn() ? (
            canReview ? (
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
                    {reviewSubmitting ? t('events.review_submitting') : t('events.review_submit_btn')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', border: '1px dashed #d1d5db', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                {reviewReasonMessage}
              </div>
            )
          ) : (
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', border: '1px dashed #d1d5db', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
              Vui lòng <Link href="/login" style={{ color: '#00B46E', fontWeight: 600, textDecoration: 'underline' }}>đăng nhập</Link> để viết đánh giá.
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

      {/* Google Maps */}
      {event?.location && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 2rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('events.category_all') === 'All' ? 'Location Map' : 'Bản đồ địa điểm'}</h3>
            </div>
            <iframe
              width="100%" height="300" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed&z=15`}
            />
          </div>
        </div>
      )}

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem 2rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('events.category_all') === 'All' ? 'Related Events' : 'Sự kiện liên quan'}</h3>
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
                      {!re.imageUrl && <span style={{ fontSize: '0.85rem', color: '#a0aec0' }}>TRIVENT</span>}
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#00B46E', fontWeight: 600, marginBottom: '0.3rem' }}>{re.category?.name || 'Sự kiện'}</div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 0.4rem', lineHeight: 1.3 }}>{re.title}</h4>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                        Thời gian: {new Date(re.startTime).toLocaleDateString('vi-VN')} • Địa điểm: {re.location || 'TBD'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {isSplitPaymentModalOpen && currentSplitOrderId && (
        <SplitPaymentModal 
          orderId={currentSplitOrderId} 
          onClose={() => setSplitPaymentModalOpen(false)} 
        />
      )}

      <Footer />
    </>
  );
}
