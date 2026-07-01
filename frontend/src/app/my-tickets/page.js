'use client';
import { showPopup } from '@/components/GlobalPopup';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn, getUser } from '@/lib/api';
import { useTranslation } from '@/context/TranslationContext';
import SplitPaymentModal from '@/components/SplitPaymentModal';

const calculateTicketTimeLeft = (createdAt, timeoutMinutes = 10) => {
  if (!createdAt) return '00:00';
  const expireTime = new Date(createdAt).getTime() + timeoutMinutes * 60000;
  const now = new Date().getTime();
  const diff = expireTime - now;
  if (diff <= 0) return '00:00';
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const CountdownTimer = ({ createdAt, timeoutMinutes }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTicketTimeLeft(createdAt, timeoutMinutes));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTicketTimeLeft(createdAt, timeoutMinutes));
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt, timeoutMinutes]);

  if (timeLeft === '00:00') return <span>Đã hết hạn</span>;
  return <span>{timeLeft}</span>;
};
export default function MyTicketsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payOSData, setPayOSData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, SUCCESS, PENDING, CANCELLED
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [user, setUser] = useState(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState(10);
  const [currentSplitOrderId, setCurrentSplitOrderId] = useState(null);
  const [isSplitPaymentModalOpen, setSplitPaymentModalOpen] = useState(false);
  const [revealedTickets, setRevealedTickets] = useState([]);
  const { t } = useTranslation();

  const handleRevealTicket = (ticketId) => {
    setRevealedTickets(prev => 
      prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]
    );
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    const userInfo = getUser();
    if (userInfo) setUser(userInfo);
    
    const params = new URLSearchParams(window.location.search);
    const viewMode = params.get('view');
    if (viewMode === 'tickets') {
      setActiveTab('SUCCESS');
    } else {
      setActiveTab('ALL');
    }

    loadConfig();
    loadOrders();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const viewMode = params.get('view');
      
      if (viewMode === 'tickets') {
        const latestSuccess = orders.find(o => o.paymentStatus === 'PAID');
        if (latestSuccess) {
          setExpandedOrderIds([latestSuccess.id]);
        }
      } else {
        setExpandedOrderIds([]);
      }
    }
  }, [orders]);

  const loadConfig = async () => {
    try {
      const res = await apiRequest('/config/payment-timeout');
      if (res.success && res.data?.timeoutMinutes) {
        setTimeoutMinutes(res.data.timeoutMinutes);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await apiRequest('/orders/my');
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (orderId) => {
    setExpandedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleRetryPayment = async (orderId) => {
    try {
      setLoading(true);
      const payOSRes = await apiRequest('/payments/create-payos-link', {
        method: 'POST',
        body: JSON.stringify({ orderIds: [orderId] }),
      });
      if (payOSRes.success && payOSRes.data) {
        setPayOSData(payOSRes.data);
        setShowPaymentModal(true);
      } else {
        showPopup('Không thể tạo link thanh toán. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Retry payment error:', error);
      showPopup('Đã xảy ra lỗi khi tạo thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPayOSData(null);
    loadOrders();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'SUCCESS') return order.paymentStatus === 'PAID';
    if (activeTab === 'PENDING') return order.paymentStatus === 'PENDING' || order.paymentStatus === 'PARTIAL_PAID';
    if (activeTab === 'CANCELLED') return order.paymentStatus === 'CANCELLED' || order.paymentStatus === 'FAILED' || order.paymentStatus === 'REFUNDED';
    return true;
  });

  const printTicketPdf = (ticket, orderRef, createdAt) => {
    const win = window.open('', '_blank');
    if (!win) { showPopup(t('tickets.popup_warning')); return; }
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Vé - ${ticket.eventTitle}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: #fff; }
        .ticket { max-width: 500px; margin: 0 auto; border: 2px solid #00B46E; border-radius: 16px; overflow: hidden; }
        .ticket-header { background: linear-gradient(135deg, #00B46E, #10b981); color: white; padding: 24px; text-align: center; }
        .ticket-header h1 { margin: 0; font-size: 20px; }
        .ticket-header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
        .ticket-body { padding: 24px; }
        .ticket-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .ticket-row:last-child { border-bottom: none; }
        .ticket-label { color: #6b7280; font-size: 13px; }
        .ticket-value { font-weight: 700; font-size: 14px; }
        .ticket-qr { text-align: center; padding: 16px; }
        .ticket-qr img { width: 180px; height: 180px; }
        .ticket-code { text-align: center; font-family: monospace; font-size: 11px; color: #6b7280; word-break: break-all; padding: 8px; }
        .ticket-footer { text-align: center; padding: 12px; background: #f8fafc; font-size: 11px; color: #9ca3af; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="ticket">
        <div class="ticket-header">
          <h1>TRIVENT</h1>
          <p>${t('tickets.pdf_title')}</p>
        </div>
        <div class="ticket-body">
          <div class="ticket-row"><span class="ticket-label">${t('events.category_all') === 'All' ? 'Event' : 'Sự kiện'}</span><span class="ticket-value">${ticket.eventTitle}</span></div>
          <div class="ticket-row"><span class="ticket-label">${t('events.category_all') === 'All' ? 'Ticket Type' : 'Loại vé'}</span><span class="ticket-value">${ticket.ticketTypeName}</span></div>
          <div class="ticket-row"><span class="ticket-label">${t('tickets.order_id')}</span><span class="ticket-value">${orderRef || 'N/A'}</span></div>
          <div class="ticket-row"><span class="ticket-label">${t('tickets.date_purchased')}</span><span class="ticket-value">${formatDate(createdAt)}</span></div>
          <div class="ticket-row"><span class="ticket-label">${t('tickets.status')}</span><span class="ticket-value">${ticket.checkinStatus === 'UNUSED' ? t('tickets.status_unused') + ' ✅' : t('tickets.status_used')}</span></div>
        </div>
        ${ticket.qrCode ? `<div class="ticket-qr"><img src="data:image/png;base64,${ticket.qrCode}" alt="QR Code" /></div>` : `<div style="text-align:center; padding: 30px 20px; color: #ef4444; font-weight: bold; border: 2px dashed #ef4444; margin: 20px; border-radius: 8px;">${t('tickets.not_paid').toUpperCase()}<br/><span style="font-size: 12px; color: #6b7280; font-weight: normal;">${t('tickets.not_paid_desc')}</span></div>`}
        ${ticket.qrToken ? `<div class="ticket-code">${ticket.qrToken}</div>` : ''}
        <div class="ticket-footer">© 2026 TRIVENT — ${t('common.footer_desc')}</div>
      </div>
      <script>setTimeout(() => { window.print(); }, 300);</script>
      </body></html>
    `);
    win.document.close();
  };

  const getUsername = () => {
    if (user?.fullName) return user.fullName;
    if (user?.email) return user.email.split('@')[0];
    return 'Người dùng';
  };

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '1200px', padding: '2rem 1rem' }}>
          
          {/* Main Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Breadcrumbs & Title */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', gap: '6px' }}>
                  <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Trang chủ</Link>
                  <span>›</span>
                  <span style={{ color: '#00B46E', fontWeight: 600 }}>Đơn hàng của tôi</span>
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Đơn hàng của tôi</h1>
              </div>

              {/* Partial Paid Banner */}
              {orders.some(o => o.paymentStatus === 'PARTIAL_PAID') && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', color: '#dc2626', fontSize: '1.05rem', fontWeight: 700 }}>
                      Cảnh báo: Đơn hàng bị treo do sai số tiền thanh toán
                    </h3>
                    <p style={{ margin: 0, color: '#991b1b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      Bạn có đơn hàng (Mã GD: <strong>{orders.filter(o => o.paymentStatus === 'PARTIAL_PAID').map(o => o.transactionRef || o.id).join(', ')}</strong>) đang bị tạm giữ do số tiền chuyển khoản không khớp với hệ thống.<br/>
                      Vui lòng liên hệ Hotline <strong>1900 xxxx</strong> hoặc gửi email về <strong>cskh@trivent.vn</strong> để cung cấp biên lai và nhận hỗ trợ (hoàn tiền hoặc bù vé).
                    </p>
                  </div>
                </div>
              )}

              {/* Status Tabs */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setActiveTab('ALL')}
                  style={{ padding: '10px 24px', borderRadius: '50px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', border: 'none', background: activeTab === 'ALL' ? '#00B46E' : '#e2e8f0', color: activeTab === 'ALL' ? '#fff' : '#64748b' }}
                >
                  Tất cả
                </button>
                <button 
                  onClick={() => setActiveTab('PENDING')}
                  style={{ padding: '10px 24px', borderRadius: '50px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', border: 'none', background: activeTab === 'PENDING' ? '#00B46E' : '#e2e8f0', color: activeTab === 'PENDING' ? '#fff' : '#64748b' }}
                >
                  Chờ thanh toán
                </button>
                <button 
                  onClick={() => setActiveTab('SUCCESS')}
                  style={{ padding: '10px 24px', borderRadius: '50px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', border: 'none', background: activeTab === 'SUCCESS' ? '#00B46E' : '#e2e8f0', color: activeTab === 'SUCCESS' ? '#fff' : '#64748b' }}
                >
                  Thành công
                </button>
                <button 
                  onClick={() => setActiveTab('CANCELLED')}
                  style={{ padding: '10px 24px', borderRadius: '50px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', border: 'none', background: activeTab === 'CANCELLED' ? '#00B46E' : '#e2e8f0', color: activeTab === 'CANCELLED' ? '#fff' : '#64748b' }}
                >
                  Đã hủy
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                  <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <div key={order.id} style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                        {/* Order Header */}
                        <div style={{ padding: '1.5rem 2rem', background: '#fff', borderBottom: expandedOrderIds.includes(order.id) ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', transition: 'background 0.3s' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                                Mã đơn: #{order.id} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>(Mã GD: {order.transactionRef || 'N/A'})</span>
                              </h3>
                              <span style={{ 
                                padding: '6px 12px', 
                                borderRadius: '50px', 
                                fontSize: '0.85rem', 
                                fontWeight: 600,
                                background: order.paymentStatus === 'PAID' ? '#dcfce7' : order.paymentStatus === 'PENDING' ? '#fef9c3' : order.paymentStatus === 'PARTIAL_PAID' ? '#fee2e2' : '#f1f5f9',
                                color: order.paymentStatus === 'PAID' ? '#16a34a' : order.paymentStatus === 'PENDING' ? '#ca8a04' : order.paymentStatus === 'PARTIAL_PAID' ? '#dc2626' : '#64748b'
                              }}>
                                {order.paymentStatus === 'PAID' ? 'Thành công' : 
                                 order.paymentStatus === 'PENDING' ? 'Chờ thanh toán' : 
                                 order.paymentStatus === 'PARTIAL_PAID' ? 'Lỗi thanh toán' : 
                                 order.paymentStatus === 'CANCELLED' ? 'Đã hủy' : 
                                 order.paymentStatus === 'REFUNDED' ? 'Đã hoàn tiền' :
                                 'Thất bại'}
                              </span>

                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                              Ngày đặt: {formatDate(order.createdAt)} • Số lượng: {order.ticketCount} vé
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Tổng tiền</div>
                              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{formatPrice(order.totalAmount)}</div>
                            </div>

                            <button 
                              onClick={() => toggleOrder(order.id)}
                              style={{ padding: '10px 20px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.target.style.background = '#f8fafc'} 
                              onMouseLeave={(e) => e.target.style.background = '#fff'}
                            >
                              {expandedOrderIds.includes(order.id) ? 'Thu gọn' : 'Xem chi tiết'}
                            </button>
                          </div>
                        </div>

                        {/* Tickets Grid */}
                        {expandedOrderIds.includes(order.id) && (
                        <div style={{ padding: '2rem' }}>
                          {/* Event Info Summary */}
                          <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%)', border: '1px solid #e0f2fe', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.88rem' }}>
                              <span style={{ color: '#6b7280', minWidth: '90px', flexShrink: 0, fontWeight: 500 }}>Sự kiện</span>
                              <span style={{ color: '#1a1a2e', fontWeight: 600 }}>{order.tickets?.[0]?.eventTitle || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.88rem' }}>
                              <span style={{ color: '#6b7280', minWidth: '90px', flexShrink: 0, fontWeight: 500 }}>Địa điểm</span>
                              <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Thường được tổ chức tại sự kiện</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.88rem' }}>
                              <span style={{ color: '#6b7280', minWidth: '90px', flexShrink: 0, fontWeight: 500 }}>Thời gian</span>
                              <span style={{ color: '#1a1a2e', fontWeight: 600 }}>{order.tickets?.[0]?.startDate ? formatDate(order.tickets[0].startDate) : 'N/A'}</span>
                            </div>
                          </div>
                          
                          {/* Ticket Details Summary */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                            {(() => {
                              const ticketGroups = {};
                              order.tickets?.forEach(t => {
                                const type = t.ticketTypeName || 'Vé thường';
                                if (!ticketGroups[type]) {
                                  ticketGroups[type] = [];
                                }
                                ticketGroups[type].push(t);
                              });
                              
                              const ticketEntries = Object.entries(ticketGroups);
                              
                              return (
                                <>
                                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Chi tiết vé</p>
                                    {ticketEntries.map(([type, seats], idx) => {
                                    // Group seats by price
                                    const byPrice = {};
                                    seats.forEach(s => {
                                      const p = s.price || 0;
                                      if (!byPrice[p]) byPrice[p] = [];
                                      byPrice[p].push(s);
                                    });

                                    const sortedPrices = Object.keys(byPrice).map(Number).sort((a,b) => b - a);
                                    const totalQty = seats.length;
                                    const totalPrice = seats.reduce((sum, s) => sum + (s.price || 0), 0);

                                    return (
                                      <div key={idx} style={{ paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px dashed #e2e8f0' }}>
                                        {/* Tên khán đài */}
                                        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>{type}</p>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                                          {sortedPrices.map((price, pIdx) => {
                                            const subSeats = byPrice[price];
                                            const subQty = subSeats.length;
                                            const subtotal = subQty * price;
                                            
                                            let label = 'Vé';

                                            // Count identical seat names (though usually 1 for each)
                                            const seatCounts = {};
                                            subSeats.forEach(s => {
                                              const name = s.seatName && s.seatName !== 'Không có (Khu vực chung)' && s.seatName !== 'Khu vực chung' ? s.seatName : null;
                                              if (name) {
                                                seatCounts[name] = (seatCounts[name] || 0) + 1;
                                              }
                                            });

                                            return (
                                              <div key={price}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <span style={{ fontWeight: 600, color: '#334155' }}>{label}</span>
                                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatPrice(subtotal)}</span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                                                  <span>{subQty} × {formatPrice(price)}</span>
                                                </div>
                                                {Object.keys(seatCounts).length > 0 && (
                                                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                                                    <span style={{ fontSize: '0.78rem', color: '#6b7280', marginRight: '8px' }}>Ghế:</span>
                                                    {Object.entries(seatCounts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count], i) => (
                                                      <span key={i} style={{ 
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                                                        padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', 
                                                        borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, 
                                                        marginRight: '6px', marginBottom: '4px' 
                                                      }}>
                                                        {name} {count > 1 ? `(x${count})` : ''}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Tổng cộng:</span>
                                          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{formatPrice(totalPrice)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  </div>
                                  
                                  {/* Total Bill Section */}
                                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#334155', paddingBottom: order.discountAmount > 0 ? '0.5rem' : '1rem', borderBottom: order.discountAmount > 0 ? 'none' : '1px dashed #cbd5e1', marginBottom: order.discountAmount > 0 ? '0' : '1rem' }}>
                                      <span>Tổng tiền ({order.tickets?.length || 0} vé):</span>
                                      <span>{formatPrice((order.totalAmount || 0) + (order.discountAmount || 0))}</span>
                                    </div>
                                    {order.discountAmount > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#16a34a', paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1', marginBottom: '1rem' }}>
                                        <span>Mã giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}:</span>
                                        <span>- {formatPrice(order.discountAmount)}</span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Tổng thanh toán:</span>
                                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00B46E' }}>{formatPrice(order.totalAmount)}</span>
                                    </div>
                                  </div>

                                  {order.paymentStatus === 'PENDING' && (
                                    <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '12px', padding: '1.25rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#9a3412' }}>Thời gian thanh toán còn lại:</span>
                                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        <CountdownTimer createdAt={order.createdAt} timeoutMinutes={timeoutMinutes} />
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                            
                            {order.paymentStatus === 'PENDING' && (
                              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                {order.tickets?.length > 1 && (
                                  <button 
                                    onClick={() => {
                                      setCurrentSplitOrderId(order.id);
                                      setSplitPaymentModalOpen(true);
                                    }}
                                    style={{ padding: '12px 28px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}
                                    onMouseEnter={(e) => e.target.style.background = '#7c3aed'} 
                                    onMouseLeave={(e) => e.target.style.background = '#8b5cf6'}
                                  >
                                    🤝 Thanh toán chia nhóm
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleRetryPayment(order.id)}
                                  style={{ padding: '12px 28px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)' }}
                                  onMouseEnter={(e) => e.target.style.background = '#d97706'} 
                                  onMouseLeave={(e) => e.target.style.background = '#f59e0b'}
                                >
                                  Thanh toán lại ngay
                                </button>
                              </div>
                            )}

                          {order.paymentStatus === 'PAID' ? (
                            <>
                              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#334155' }}>Mã QR của bạn</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                                {order.tickets?.map((tItem) => (
                                  <div key={tItem.id} style={{ display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{ padding: '1.25rem', position: 'relative' }}>
                                      <div style={{ background: 'rgba(0,180,110,0.1)', color: '#00B46E', padding: '6px 12px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'inline-block', marginBottom: '1rem', textAlign: 'center' }}>
                                        Ticket #{tItem.id}
                                      </div>
                                      
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0 0.5rem' }}>
                                        <span style={{ color: '#94a3b8' }}>Trạng thái check-in</span>
                                        <span style={{ 
                                          padding: '3px 8px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 700,
                                          background: tItem.checkinStatus === 'UNUSED' ? '#ecfdf5' : '#f1f5f9',
                                          color: tItem.checkinStatus === 'UNUSED' ? '#059669' : '#64748b'
                                        }}>
                                          {tItem.checkinStatus === 'UNUSED' ? 'Chưa sử dụng' : 'Đã sử dụng'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Divider Section with punches */}
                                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '24px' }}>
                                      <div style={{ width: '16px', height: '16px', background: '#f8fafc', borderRadius: '50%', position: 'absolute', left: '-8px', borderRight: '1px solid #e2e8f0' }}></div>
                                      <div style={{ flex: 1, borderTop: '2px dashed #cbd5e1', margin: '0 12px' }}></div>
                                      <div style={{ width: '16px', height: '16px', background: '#f8fafc', borderRadius: '50%', position: 'absolute', right: '-8px', borderLeft: '1px solid #e2e8f0' }}></div>
                                    </div>

                                    {/* QR Code / Action */}
                                    <div style={{ padding: '1.25rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <div style={{ width: 180, height: 180, marginBottom: '1rem', background: '#fff', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
                                        {tItem.qrCode ? (
                                          <>
                                            <img 
                                              src={`data:image/png;base64,${tItem.qrCode}`} 
                                              alt="QR Code" 
                                              onClick={() => {
                                                if (tItem.checkinStatus === 'UNUSED' && revealedTickets.includes(tItem.id)) {
                                                  handleRevealTicket(tItem.id);
                                                }
                                              }}
                                              style={{ 
                                                width: '100%', 
                                                height: '100%', 
                                                objectFit: 'contain', 
                                                filter: tItem.checkinStatus !== 'UNUSED' ? 'blur(5px) grayscale(100%)' : (!revealedTickets.includes(tItem.id) ? 'blur(8px)' : 'none'), 
                                                opacity: tItem.checkinStatus !== 'UNUSED' ? 0.4 : 1, 
                                                transition: 'filter 0.3s ease',
                                                cursor: tItem.checkinStatus === 'UNUSED' && revealedTickets.includes(tItem.id) ? 'pointer' : 'default'
                                              }} 
                                            />
                                            {tItem.checkinStatus !== 'UNUSED' && (
                                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.3)', zIndex: 10 }}>
                                                <div style={{ background: '#ef4444', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 800, transform: 'rotate(-15deg)', border: '2px solid #b91c1c', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)', letterSpacing: '0.5px' }}>
                                                  ĐÃ SỬ DỤNG
                                                </div>
                                              </div>
                                            )}
                                            {tItem.checkinStatus === 'UNUSED' && !revealedTickets.includes(tItem.id) && (
                                              <div 
                                                onClick={() => handleRevealTicket(tItem.id)}
                                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', zIndex: 10, cursor: 'pointer', borderRadius: '12px', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                              >
                                                <div style={{ width: '40px', height: '40px', background: '#00B46E', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', boxShadow: '0 4px 6px -1px rgba(0,180,110,0.4)' }}>
                                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Chạm để hiện mã</span>
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.8rem' }}>No QR</div>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                        {tItem.qrToken && (
                                          <button onClick={() => { navigator.clipboard.writeText(tItem.qrToken); showPopup(t('events.share_success')); }} style={{ flex: 1, padding: '8px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#cbd5e1'} onMouseLeave={(e) => e.target.style.background = '#e2e8f0'}>
                                            Copy Code
                                          </button>
                                        )}
                                        <button onClick={() => printTicketPdf(tItem, order.id, order.createdAt)} style={{ flex: 1, padding: '8px', background: '#00B46E', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#009458'} onMouseLeave={(e) => e.target.style.background = '#00B46E'}>
                                          Lưu PDF
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : order.paymentStatus === 'PENDING' ? (
                            <div style={{ marginTop: '2rem', padding: '2rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a', textAlign: 'center' }}>
                              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                              </div>
                              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b45309', marginBottom: '0.5rem' }}>Bạn cần thanh toán để được cấp vé</h4>
                              <p style={{ color: '#d97706', fontSize: '0.9rem', margin: 0 }}>Vui lòng hoàn tất thanh toán để hệ thống tiến hành phát hành vé và mã QR cho bạn.</p>
                            </div>
                          ) : (
                            <div style={{ marginTop: '2rem', padding: '2rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
                              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                              </div>
                              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c', marginBottom: '0.5rem' }}>Vé của bạn đã bị hủy</h4>
                              <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0 }}>Rất tiếc, đơn hàng này đã bị hủy nên vé không còn hiệu lực sử dụng.</p>
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '180px', height: '180px', marginBottom: '2rem', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                      <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '0.5rem' }}>Bạn chưa có vé nào</h3>
                      <Link href="/events" className="btn btn-primary" style={{ marginTop: '1.5rem', padding: '12px 30px', borderRadius: '50px', fontWeight: 700, fontSize: '1rem', background: '#00B46E', color: 'white', textDecoration: 'none', display: 'inline-block' }}>Mua vé ngay</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </main>
      <Footer />

      {/* Split Payment Modal */}
      {isSplitPaymentModalOpen && currentSplitOrderId && (
        <SplitPaymentModal 
          orderId={currentSplitOrderId} 
          onClose={() => {
            setSplitPaymentModalOpen(false);
            loadOrders();
          }} 
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '450px', height: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Thanh toán đơn hàng</h3>
              <button 
                onClick={closePaymentModal}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              {payOSData && (
                <iframe
                  src={payOSData.checkoutUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PayOS Checkout"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
