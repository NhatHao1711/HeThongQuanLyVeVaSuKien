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
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>📦 Đơn hàng của tôi</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.05rem', position: 'relative', zIndex: 2 }}>Theo dõi trạng thái đơn hàng và lịch sử giao dịch</p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛒</div>
                <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '0.5rem' }}>Bạn chưa có đơn hàng nào</h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Hãy chọn cho mình một sự kiện yêu thích và bắt đầu trải nghiệm nhé!</p>
                <Link href="/events" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '50px', fontWeight: 600 }}>Khám phá sự kiện</Link>
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
                        {['Đặt vé', 'Chờ thanh toán', 'Đã thanh toán', 'Hoàn thành'].map((step, i) => {
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
                                  {isFailed ? 'Đã hủy' : step}
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
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>🎟️ {ticket.ticketTypeName}</span>
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
                          <span style={{ fontWeight: 600, color: '#475569' }}>{order.ticketCount} vé</span>
                          {order.voucherCode && <span> • 🎁 Voucher: <strong style={{ color: '#f59e0b' }}>{order.voucherCode}</strong> (-{formatPrice(order.discountAmount)})</span>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.2rem', fontWeight: 600 }}>Tổng thanh toán</div>
                          <div style={{ fontWeight: 900, fontSize: '1.3rem', color: '#00B46E' }}>
                            {formatPrice(order.totalAmount)}
                          </div>
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
