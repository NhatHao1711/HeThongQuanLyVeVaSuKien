'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn } from '@/lib/api';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    loadOrders();
  }, []);

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
    PENDING: { label: 'Chờ thanh toán', color: '#f59e0b', bg: '#fef3c7' },
    PAID: { label: 'Đã thanh toán', color: '#10b981', bg: '#d1fae5' },
    FAILED: { label: 'Đã hủy', color: '#ef4444', bg: '#fee2e2' },
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
                <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Trang chủ</Link>
                <span> / Đơn hàng</span>
              </div>
              <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Quay lại</Link>
            </div>

            <div className="section-header">
              <h2>Đơn hàng của tôi</h2>
              <p>Theo dõi trạng thái đơn hàng và lịch sử mua vé</p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#cbd5e1' }}>Không có dữ liệu</div>
                <p>Bạn chưa có đơn hàng nào. <Link href="/events" style={{ color: 'var(--primary)' }}>Khám phá sự kiện ngay!</Link></p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => {
                  const status = getStatus(order.paymentStatus);
                  return (
                    <div key={order.id} style={{
                      background: '#fff', borderRadius: 16, overflow: 'hidden',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
                      transition: 'box-shadow 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}
                    >
                      {/* Order Header */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a1a2e', fontSize: '0.9rem' }}>
                            {order.transactionRef}
                          </span>
                          <span style={{
                            background: status.bg, color: status.color, padding: '3px 12px',
                            borderRadius: 20, fontSize: '0.78rem', fontWeight: 700
                          }}>
                            {status.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          {formatDate(order.createdAt)}
                        </span>
                      </div>

                      {/* Order Timeline */}
                      <div style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0', justifyContent: 'center' }}>
                        {['Đặt vé', 'Chờ TT', 'Đã TT', 'Hoàn thành'].map((step, i) => {
                          const isActive = (order.paymentStatus === 'PENDING' && i <= 1) ||
                            (order.paymentStatus === 'PAID' && i <= 3) ||
                            (order.paymentStatus === 'FAILED' && i === 0);
                          const isFailed = order.paymentStatus === 'FAILED' && i === 1;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isFailed ? '#fee2e2' : isActive ? '#d1fae5' : '#f1f5f9',
                                color: isFailed ? '#ef4444' : isActive ? '#10b981' : '#9ca3af',
                                fontSize: '0.7rem', fontWeight: 700, border: `2px solid ${isFailed ? '#ef4444' : isActive ? '#10b981' : '#e2e8f0'}`
                              }}>
                                {isFailed ? '✕' : isActive ? '✓' : i + 1}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: isActive ? '#1a1a2e' : '#9ca3af', margin: '0 4px', fontWeight: isActive ? 600 : 400 }}>
                                {isFailed ? 'Đã hủy' : step}
                              </span>
                              {i < 3 && <div style={{ width: 30, height: 2, background: isActive && !isFailed ? '#10b981' : '#e2e8f0', margin: '0 2px' }} />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tickets */}
                      <div style={{ padding: '0 1.5rem 1rem' }}>
                        {order.tickets?.map((ticket, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.6rem 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none'
                          }}>
                            <div>
                              <Link href={`/events/${ticket.eventId}`} style={{ color: '#1a1a2e', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
                                {ticket.eventTitle}
                              </Link>
                              <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: 8 }}>• {ticket.ticketTypeName}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{formatPrice(ticket.price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Order Footer */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.8rem 1.5rem', borderTop: '1px solid #f1f5f9', background: '#fafbfc'
                      }}>
                        <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          {order.ticketCount} vé
                          {order.voucherCode && <span> • Voucher: <strong>{order.voucherCode}</strong> (-{formatPrice(order.discountAmount)})</span>}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a1a2e' }}>
                          {formatPrice(order.totalAmount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
