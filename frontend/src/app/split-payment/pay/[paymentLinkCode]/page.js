'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SplitPaymentCheckout({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unwrappedParams = React.use(params);
  const paymentLinkCode = unwrappedParams.paymentLinkCode;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payOSLoading, setPayOSLoading] = useState(false);
  const [payOSUrl, setPayOSUrl] = useState('');
  const [qrStartTime, setQrStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);

  // Lấy params "status" từ PayOS trả về (nếu có)
  const paymentStatus = searchParams.get('status');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/split-payment/${paymentLinkCode}`);
        const result = await res.json();
        if (result.success && isMounted) {
          setData(result.data);
          if (paymentStatus === 'success' || result.data.status === 'PAID') {
             // Đã thanh toán thành công
          }
        } else if (isMounted) {
          setError(result.message || 'Không tìm thấy liên kết thanh toán');
        }
      } catch (err) {
        if (isMounted) setError('Lỗi kết nối server');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();

    // Polling every 5 seconds to update progress automatically
    const interval = setInterval(fetchData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [paymentLinkCode, paymentStatus]);

  const handlePay = async () => {
    setPayOSLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/split-payment/${paymentLinkCode}/pay`, {
        method: 'POST'
      });
      const result = await res.json();
      if (result.success && result.data.checkoutUrl) {
        setPayOSUrl(result.data.checkoutUrl);
        setQrStartTime(Date.now());
      } else {
        setError(result.message || 'Không thể tạo liên kết PayOS');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setPayOSLoading(false);
    }
  };

  useEffect(() => {
    if (data && data.status !== 'PAID' && !payOSUrl && !payOSLoading) {
      handlePay();
    }
  }, [data, payOSUrl, payOSLoading]);

  useEffect(() => {
    if (!qrStartTime || !data || data.status === 'PAID') return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - qrStartTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(timer);
        handlePay();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [qrStartTime, data]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: '#fff', padding: '3rem', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😞</div>
          <h2 style={{ color: '#0f172a', marginBottom: '1rem' }}>Lỗi truy cập</h2>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'success' || data?.status === 'PAID') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' }}>
        <div style={{ background: '#fff', padding: '4rem 3rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.2)', textAlign: 'center', maxWidth: '450px' }}>
          <div style={{ 
            width: '80px', height: '80px', background: '#10b981', color: '#fff', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '2.5rem', margin: '0 auto 2rem', boxShadow: '0 10px 15px rgba(16, 185, 129, 0.3)'
          }}>✓</div>
          <h2 style={{ color: '#065f46', fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Thanh toán thành công!</h2>
          <p style={{ color: '#475569', fontSize: '1.1rem', margin: 0 }}>Cảm ơn bạn đã đóng góp phần tiền của mình cho sự kiện <strong>{data.eventName}</strong>. Nhóm bạn đã tiến gần hơn đến sự kiện!</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
      {payOSUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '450px' }}>
          <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '1rem', background: '#fee2e2', padding: '6px 16px', borderRadius: '50px', fontSize: '0.95rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            Mã QR sẽ làm mới sau: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div style={{ width: '100%', height: '80vh', maxHeight: '700px', background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <iframe
              src={payOSUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="PayOS Checkout"
              allow="clipboard-write"
            />
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '4rem 3rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', textAlign: 'center', maxWidth: '450px', width: '100%', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }}></div>
          
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ background: '#f1f5f9', color: '#64748b', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Lời mời thanh toán
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', lineHeight: 1.3 }}>
            Bạn bè đang cần bạn trợ giúp!
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.05rem', marginBottom: '2rem' }}>
            Bạn được mời góp phần thanh toán vé cho sự kiện <strong style={{ color: '#334155' }}>{data?.eventName}</strong>.
          </p>

          <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '2rem', marginBottom: '2.5rem', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Chi tiết vé:</span>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>
                {data?.ticketTypeName} {data?.seatName ? `- Ghế ${data.seatName}` : ''}
              </span>
            </div>
            <p style={{ color: '#64748b', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Số tiền của bạn:</p>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data?.amount || 0)}
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

          <button 
            onClick={handlePay}
            disabled={payOSLoading}
            style={{ 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', 
              padding: '1.2rem', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', 
              width: '100%', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 20px -3px rgba(99, 102, 241, 0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(99, 102, 241, 0.4)'; }}
          >
            {payOSLoading ? (
              <><div className="spinner" style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> Đang khởi tạo...</>
            ) : (
              <>💳 Thanh toán phần của tôi ngay</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
