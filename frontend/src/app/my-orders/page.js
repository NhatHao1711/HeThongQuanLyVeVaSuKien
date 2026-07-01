'use client';
import { showPopup } from '@/components/GlobalPopup';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn } from '@/lib/api';
import { useTranslation } from '@/context/TranslationContext';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [repayMethod, setRepayMethod] = useState('bank'); // 'bank' | 'vnpay'
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [payOSData, setPayOSData] = useState(null);
  const [payOSLoading, setPayOSLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    loadOrders();
  }, []);

  // Fetch PayOS payment link when selectedOrder or repayMethod changes
  useEffect(() => {
    if (selectedOrder && repayMethod === 'bank') {
      fetchPayOSLink(selectedOrder.id);
    } else {
      setPayOSData(null);
    }
  }, [selectedOrder, repayMethod]);

  // Polling order status
  useEffect(() => {
    let intervalId = null;
    if (selectedOrder && selectedOrder.paymentStatus === 'PENDING') {
      intervalId = setInterval(async () => {
        try {
          const res = await apiRequest(`/orders/${selectedOrder.id}/status`);
          if (res.success && res.data && res.data.status === 'PAID') {
            clearInterval(intervalId);
            setSelectedOrder(null);
            showPopup('Thanh toán thành công!');
            loadOrders();
          }
        } catch (err) {
          console.error('Polling status error:', err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedOrder]);

  const fetchPayOSLink = async (orderId) => {
    setPayOSLoading(true);
    setPaymentError('');
    try {
      const res = await apiRequest('/payments/create-payos-link', {
        method: 'POST',
        body: JSON.stringify({ orderId })
      });
      if (res.success && res.data) {
        setPayOSData(res.data);
      } else {
        setPaymentError(res.message || 'Không thể tạo liên kết thanh toán PayOS');
      }
    } catch (err) {
      setPaymentError('Lỗi kết nối server.');
    } finally {
      setPayOSLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await apiRequest('/orders/my');
      if (res.success) setOrders(res.data || []);
    } catch (err) { console.error('Failed to load orders:', err); }
    finally { setLoading(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(p || 0);

  const statusConfig = {
    PENDING: { label: t('orders.status_pending'), color: '#f59e0b', bg: '#fef3c7' },
    PAID: { label: t('orders.status_paid'), color: '#10b981', bg: '#d1fae5' },
    FAILED: { label: t('orders.status_failed'), color: '#ef4444', bg: '#fee2e2' },
  };

  const getStatus = (s) => statusConfig[s] || statusConfig.PENDING;

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '80px', position: 'relative', zIndex: 1 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: 900 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{t('nav.home')}</Link>
                <span> / {t('orders.title')}</span>
              </div>
              <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← {t('common.back')}</Link>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '2.5rem 2rem',
              borderRadius: '20px',
              color: 'white',
              marginBottom: '2.5rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(0,180,110,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>{t('orders.title')}</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.05rem', position: 'relative', zIndex: 2 }}>{t('orders.subtitle')}</p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '0.5rem' }}>{t('orders.no_orders_title')}</h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{t('orders.no_orders_desc')}</p>
                <Link href="/events" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '50px', fontWeight: 600 }}>{t('orders.explore_btn')}</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => {
                  const status = getStatus(order.paymentStatus);
                  return (
                    <div key={order.id} style={{
                      background: '#fff', borderRadius: 20, overflow: 'hidden',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.04)'; }}
                    >
                      {/* Order Header */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1.2rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '1rem', letterSpacing: '0.5px' }}>
                            {order.transactionRef}
                          </span>
                          <span style={{
                            background: status.bg, color: status.color, padding: '4px 12px',
                            borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>
                            {status.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                          {formatDate(order.createdAt)}
                        </span>
                      </div>

                      {/* Order Timeline */}
                      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {[t('events.booking_title'), t('orders.status_pending'), t('orders.status_paid'), t('events.booking_step_success')].map((step, i) => {
                          const isActive = (order.paymentStatus === 'PENDING' && i <= 1) ||
                            (order.paymentStatus === 'PAID' && i <= 3) ||
                            (order.paymentStatus === 'FAILED' && i === 0);
                          const isFailed = order.paymentStatus === 'FAILED' && i === 1;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                                  background: isFailed ? '#fee2e2' : isActive ? '#d1fae5' : '#f1f5f9',
                                  color: isFailed ? '#ef4444' : isActive ? '#059669' : '#94a3b8',
                                  fontSize: '0.85rem', fontWeight: 800, border: `2px solid ${isFailed ? '#ef4444' : isActive ? '#10b981' : '#e2e8f0'}`,
                                  boxShadow: isActive && !isFailed ? '0 0 10px rgba(16,185,129,0.3)' : 'none'
                                }}>
                                  {isFailed ? '✕' : isActive ? '✓' : i + 1}
                                </div>
                                <span style={{ position: 'absolute', top: '40px', fontSize: '0.75rem', color: isActive ? '#1e293b' : '#94a3b8', fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' }}>
                                  {isFailed ? t('orders.status_failed') : step}
                                </span>
                              </div>
                              {i < 3 && <div style={{ flex: 1, height: 3, background: isActive && !isFailed ? '#10b981' : '#e2e8f0', margin: '0 -4px', zIndex: 1 }} />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tickets */}
                      <div style={{ padding: '1rem 1.5rem' }}>
                        {order.tickets?.map((ticket, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.8rem 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none'
                          }}>
                            <div>
                              <Link href={`/events/${ticket.eventId}`} style={{ color: '#1e293b', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                                {ticket.eventTitle}
                              </Link>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Loại vé: {ticket.ticketTypeName}</span>
                            </div>
                            <span style={{ fontWeight: 800, color: '#00B46E', fontSize: '0.95rem' }}>{formatPrice(ticket.price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Receipt Divider */}
                      <div style={{ borderTop: '2px dashed #cbd5e1', margin: '0 1.5rem' }}></div>

                      {/* Order Footer */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1.2rem 1.5rem', background: '#fff'
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{order.ticketCount} {t('events.detail_tickets').toLowerCase().includes('tickets') ? 'tickets' : 'vé'}</span>
                          {order.voucherCode && <span> • Voucher: <strong style={{ color: '#f59e0b' }}>{order.voucherCode}</strong> (-{formatPrice(order.discountAmount)})</span>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.2rem', fontWeight: 600 }}>{t('events.booking_final_total')}</div>
                          <div style={{ fontWeight: 900, fontSize: '1.3rem', color: '#00B46E' }}>
                            {formatPrice(order.totalAmount)}
                          </div>
                        </div>
                      </div>

                      {order.paymentStatus === 'PENDING' && (
                        <div style={{
                          padding: '0 1.5rem 1.2rem',
                          textAlign: 'right',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '1rem',
                          marginTop: '-0.5rem'
                        }}>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setRepayMethod('bank');
                              setPaymentError('');
                            }}
                            className="btn btn-primary"
                            style={{
                              padding: '8px 24px',
                              borderRadius: '50px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              background: '#f59e0b',
                              borderColor: '#f59e0b',
                              color: '#fff',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
                              transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(245,158,11,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(245,158,11,0.25)'; }}
                          >
                            {t('orders.pay_now') || 'Thanh toán ngay'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Payment Modal */}
        {selectedOrder && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
            <div style={{
              background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
              position: 'relative', display: 'flex', flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {t('orders.payment_repay') || 'Thanh toán đơn hàng'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
                    Mã giao dịch: <strong style={{ fontFamily: 'monospace' }}>{selectedOrder.transactionRef}</strong>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
                >✕</button>
              </div>

              {/* Content */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                {/* Payment Method Selector */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => setRepayMethod('bank')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', border: repayMethod === 'bank' ? '2px solid #00B46E' : '1px solid #cbd5e1',
                      background: repayMethod === 'bank' ? '#f0fdf4' : '#fff', color: repayMethod === 'bank' ? '#15803d' : '#475569',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    Chuyển khoản
                  </button>
                  <button
                    onClick={() => setRepayMethod('vnpay')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', border: repayMethod === 'vnpay' ? '2px solid #00B46E' : '1px solid #cbd5e1',
                      background: repayMethod === 'vnpay' ? '#f0fdf4' : '#fff', color: repayMethod === 'vnpay' ? '#15803d' : '#475569',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    Cổng VNPay
                  </button>
                </div>

                {repayMethod === 'bank' ? (
                  <div>
                    {payOSLoading ? (
                      <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="spinner" style={{ width: 35, height: 35, margin: '0 auto' }}></div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '10px' }}>Đang khởi tạo mã QR thanh toán...</p>
                      </div>
                    ) : payOSData ? (
                      <div>
                        {/* Bank Details */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span style={{ color: '#64748b' }}>Ngân hàng:</span>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>Vietcombank</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{payOSData.accountNumber}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{payOSData.accountName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span style={{ color: '#64748b' }}>Nội dung chuyển khoản:</span>
                              <span style={{ fontWeight: 700, color: '#00B46E', fontFamily: 'monospace' }}>{payOSData.description}</span>
                            </div>
                          </div>
                        </div>

                        {/* QR Code */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>Quét mã QR để thanh toán nhanh:</p>
                          <img 
                            src={`https://img.vietqr.io/image/${payOSData.bin}-${payOSData.accountNumber}-compact2.png?amount=${payOSData.amount}&addInfo=${encodeURIComponent(payOSData.description)}&accountName=${encodeURIComponent(payOSData.accountName)}`} 
                            alt="Mã QR VietQR" 
                            style={{ width: '100%', maxWidth: '240px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'inline-block' }}
                          />
                        </div>

                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', background: '#f0fdf4', borderRadius: '12px', marginBottom: '16px'
                        }}>
                          <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Tổng tiền:</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#166534' }}>{formatPrice(payOSData.amount)}</span>
                        </div>

                        {paymentError && (
                          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '12px' }}>
                            {paymentError}
                          </div>
                        )}

                        <a
                          href={payOSData.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            width: '100%', padding: '12px', borderRadius: '12px',
                            background: '#00B46E', borderColor: '#00B46E',
                            fontWeight: 700, fontSize: '0.9rem', color: '#fff', cursor: 'pointer',
                            display: 'block', textAlign: 'center', textDecoration: 'none',
                            boxShadow: '0 4px 12px rgba(0,180,110,0.2)'
                          }}
                        >
                          Mở cổng thanh toán PayOS (Tab mới)
                        </a>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
                        Không thể tải thông tin thanh toán. Vui lòng thử lại.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ textAlign: 'center', padding: '1.5rem 0 2rem' }}>
                      <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
                        Hệ thống sẽ chuyển hướng bạn sang cổng thanh toán VNPay để hoàn tất giao dịch an toàn.
                      </p>

                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '20px'
                      }}>
                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Cần thanh toán:</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00B46E' }}>{formatPrice(selectedOrder.totalAmount)}</span>
                      </div>

                      {paymentError && (
                        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '12px' }}>
                          {paymentError}
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          setConfirmLoading(true);
                          setPaymentError('');
                          try {
                            const res = await apiRequest('/payments/create-url', {
                              method: 'POST',
                              body: JSON.stringify({ orderId: selectedOrder.id })
                            });
                            if (res.success && res.data?.paymentUrl) {
                              window.location.href = res.data.paymentUrl;
                            } else {
                              setPaymentError(res.message || "Tạo liên kết thanh toán VNPay thất bại.");
                            }
                          } catch {
                            setPaymentError("Lỗi kết nối server.");
                          } finally {
                            setConfirmLoading(false);
                          }
                        }}
                        disabled={confirmLoading}
                        className="btn btn-primary"
                        style={{
                          width: '100%', padding: '12px', borderRadius: '12px',
                          background: '#00B46E', borderColor: '#00B46E',
                          fontWeight: 700, fontSize: '0.9rem', color: '#fff', cursor: 'pointer'
                        }}
                      >
                        {confirmLoading ? 'Đang chuyển hướng...' : 'Đi đến thanh toán VNPay'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
