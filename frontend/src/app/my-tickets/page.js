'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn } from '@/lib/api';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await apiRequest('/tickets');
      if (res.success) {
        setTickets(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const printTicketPdf = (ticket) => {
    const win = window.open('', '_blank');
    if (!win) { alert('Vui lòng cho phép popup để tải vé!'); return; }
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
          <p>Vé điện tử</p>
        </div>
        <div class="ticket-body">
          <div class="ticket-row"><span class="ticket-label">Sự kiện</span><span class="ticket-value">${ticket.eventTitle}</span></div>
          <div class="ticket-row"><span class="ticket-label">Loại vé</span><span class="ticket-value">${ticket.ticketTypeName}</span></div>
          <div class="ticket-row"><span class="ticket-label">Mã đơn</span><span class="ticket-value">${ticket.orderRef || 'N/A'}</span></div>
          <div class="ticket-row"><span class="ticket-label">Ngày mua</span><span class="ticket-value">${formatDate(ticket.createdAt)}</span></div>
          <div class="ticket-row"><span class="ticket-label">Trạng thái</span><span class="ticket-value">${ticket.checkinStatus === 'UNUSED' ? 'Chưa sử dụng ✅' : 'Đã sử dụng'}</span></div>
        </div>
        ${ticket.qrCode ? `<div class="ticket-qr"><img src="data:image/png;base64,${ticket.qrCode}" alt="QR Code" /></div>` : '<div style="text-align:center; padding: 30px 20px; color: #ef4444; font-weight: bold; border: 2px dashed #ef4444; margin: 20px; border-radius: 8px;">VÉ CHƯA ĐƯỢC THANH TOÁN<br/><span style="font-size: 12px; color: #6b7280; font-weight: normal;">(Mã QR sẽ hiển thị sau khi thanh toán thành công)</span></div>'}
        ${ticket.qrToken ? `<div class="ticket-code">${ticket.qrToken}</div>` : ''}
        <div class="ticket-footer">© 2026 TRIVENT — Hệ thống quản lý sự kiện cho sinh viên</div>
      </div>
      <script>setTimeout(() => { window.print(); }, 300);</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '80px', position: 'relative', zIndex: 1 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: '800px' }}>
            {/* Breadcrumb and Back Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Trang chủ</Link>
                <span> / Vé của tôi</span>
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
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>🎟️ Vé của tôi</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.05rem', position: 'relative', zIndex: 2 }}>Quản lý và xem mã check-in các sự kiện bạn đã đặt</p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
                {tickets.map((t) => (
                  <div key={t.id} style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '340px', margin: '0 auto', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.08))', transition: 'transform 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                    {/* Top Section: Event Info */}
                    <div style={{ background: '#fff', padding: '2rem 1.5rem', borderRadius: '20px 20px 0 0', position: 'relative' }}>
                      <div style={{ background: 'rgba(0,180,110,0.1)', color: '#00B46E', padding: '4px 12px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'inline-block', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                        Trivent Ticket
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem', lineHeight: 1.3 }}>{t.eventTitle}</h3>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 500 }}>{t.ticketTypeName}</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                        <span style={{ color: '#94a3b8' }}>Ngày mua</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{formatDate(t.createdAt)}</span>
                      </div>
                      {t.orderRef && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#94a3b8' }}>Mã đơn</span>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{t.orderRef}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: '#94a3b8' }}>Trạng thái</span>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700,
                          background: t.checkinStatus === 'UNUSED' ? '#ecfdf5' : '#f1f5f9',
                          color: t.checkinStatus === 'UNUSED' ? '#059669' : '#64748b'
                        }}>
                          {t.checkinStatus === 'UNUSED' ? 'Chưa sử dụng' : 'Đã sử dụng'}
                        </span>
                      </div>
                      {t.checkinTime && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', fontSize: '0.85rem' }}>
                          <span style={{ color: '#94a3b8' }}>Check-in lúc</span>
                          <span style={{ fontWeight: 600, color: '#059669' }}>{formatDate(t.checkinTime)}</span>
                        </div>
                      )}
                    </div>

                    {/* Divider Section with punches */}
                    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', position: 'relative', height: '32px' }}>
                      <div style={{ width: '24px', height: '24px', background: '#f8fafc', borderRadius: '50%', position: 'absolute', left: '-12px', boxShadow: 'inset -3px 0 5px rgba(0,0,0,0.04)' }}></div>
                      <div style={{ flex: 1, borderTop: '2px dashed #cbd5e1', margin: '0 16px' }}></div>
                      <div style={{ width: '24px', height: '24px', background: '#f8fafc', borderRadius: '50%', position: 'absolute', right: '-12px', boxShadow: 'inset 3px 0 5px rgba(0,0,0,0.04)' }}></div>
                    </div>

                    {/* Bottom Section: QR Code */}
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '0 0 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 160, height: 160, marginBottom: '1.2rem' }}>
                        {t.qrCode ? (
                          <img src={`data:image/png;base64,${t.qrCode}`} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#fef2f2', borderRadius: 12, border: '2px dashed #f87171' }}>
                            <span style={{ fontSize: '2.5rem', marginBottom: '4px', color: '#ef4444', fontWeight: 'bold' }}>!</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', textAlign: 'center' }}>Chưa<br/>thanh toán</span>
                          </div>
                        )}
                      </div>
                      {t.qrToken && (
                        <>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.2rem', fontFamily: 'monospace', letterSpacing: '2px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px' }}>
                            {t.qrToken}
                          </p>
                          <div style={{ display: 'flex', gap: '0.8rem', width: '100%' }}>
                            <button onClick={() => { navigator.clipboard.writeText(t.qrToken); alert('Đã sao chép mã vé!'); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.background = '#e2e8f0'} onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}>
                              Sao chép
                            </button>
                            <button onClick={() => printTicketPdf(t)} style={{ flex: 1, padding: '10px', background: '#00B46E', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,180,110,0.3)' }} onMouseEnter={(e) => e.target.style.background = '#009458'} onMouseLeave={(e) => e.target.style.background = '#00B46E'}>
                              Tải PDF
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {tickets.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎫</div>
                    <h3 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '0.5rem' }}>Bạn chưa có vé nào</h3>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Hãy bắt đầu hành trình trải nghiệm các sự kiện tuyệt vời ngay hôm nay!</p>
                    <Link href="/events" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '50px', fontWeight: 600 }}>Khám phá sự kiện</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
