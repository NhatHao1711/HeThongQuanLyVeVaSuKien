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
          <h1>🎫 TRIVENT</h1>
          <p>Vé điện tử</p>
        </div>
        <div class="ticket-body">
          <div class="ticket-row"><span class="ticket-label">Sự kiện</span><span class="ticket-value">${ticket.eventTitle}</span></div>
          <div class="ticket-row"><span class="ticket-label">Loại vé</span><span class="ticket-value">${ticket.ticketTypeName}</span></div>
          <div class="ticket-row"><span class="ticket-label">Mã đơn</span><span class="ticket-value">${ticket.orderRef || 'N/A'}</span></div>
          <div class="ticket-row"><span class="ticket-label">Ngày mua</span><span class="ticket-value">${formatDate(ticket.createdAt)}</span></div>
          <div class="ticket-row"><span class="ticket-label">Trạng thái</span><span class="ticket-value">${ticket.checkinStatus === 'UNUSED' ? 'Chưa sử dụng ✅' : 'Đã sử dụng'}</span></div>
        </div>
        ${ticket.qrCode ? `<div class="ticket-qr"><img src="data:image/png;base64,${ticket.qrCode}" alt="QR Code" /></div>` : ''}
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

            <div className="section-header">
              <h2>Vé của tôi</h2>
              <p>Quản lý vé sự kiện của bạn</p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }}></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tickets.map((t) => (
                  <div key={t.id} className="ticket-card" style={{ flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '1rem' }}>
                    <div className="ticket-qr" style={{ width: 180, height: 180 }}>
                      {t.qrCode ? (
                        <img
                          src={`data:image/png;base64,${t.qrCode}`}
                          alt="QR Code"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        '🎫'
                      )}
                    </div>
                    {t.qrToken && (
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                          {t.qrToken}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => { navigator.clipboard.writeText(t.qrToken); alert('Đã sao chép mã vé!'); }}
                            style={{ fontSize: '0.75rem', padding: '4px 12px', border: '1px solid var(--primary)', background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                          >
                            📋 Sao chép mã vé
                          </button>
                          <button
                            onClick={() => printTicketPdf(t)}
                            style={{ fontSize: '0.75rem', padding: '4px 12px', border: '1px solid #3b82f6', background: '#eff6ff', color: '#3b82f6', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                          >
                            📄 Tải PDF
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="ticket-info" style={{ width: '100%', textAlign: 'center' }}>
                      <h3>{t.eventTitle}</h3>
                      <p>{t.ticketTypeName}</p>
                      {t.orderRef && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mã đơn: {t.orderRef}</p>}
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ngày mua: {formatDate(t.createdAt)}</p>
                      <span className={`ticket-status ${t.checkinStatus === 'UNUSED' ? 'unused' : 'used'}`}>
                        {t.checkinStatus === 'UNUSED' ? 'Chưa sử dụng' : 'Đã sử dụng'}
                      </span>
                      {t.checkinTime && <p style={{ fontSize: '0.78rem', color: 'var(--success)' }}>Check-in: {formatDate(t.checkinTime)}</p>}
                    </div>
                  </div>
                ))}

                {tickets.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                    <p>Bạn chưa có vé nào. <Link href="/events" style={{ color: 'var(--primary)' }}>Khám phá sự kiện ngay!</Link></p>
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
