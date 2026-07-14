'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function RedirectHandler() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  
  useEffect(() => {
    if (window.parent && window.parent !== window) {
      // If in iframe, notify parent
      window.parent.postMessage({ type: 'PAYOS_REDIRECT', status }, '*');
    } else {
      // If opened directly (not in iframe), redirect to my-tickets after 3s
      setTimeout(() => {
        window.location.href = '/my-tickets';
      }, 3000);
    }
  }, [status]);
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', flexDirection: 'column', gap: '1rem' }}>
      {status === 'success' && (window.parent === window) ? (
        <div style={{ textAlign: 'center', background: '#fff', padding: '3rem', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#10b981' }}>✓</div>
          <h2 style={{ color: '#0f172a', marginBottom: '1rem' }}>Thanh toán thành công!</h2>
          <p style={{ color: '#64748b' }}>Đang chuyển hướng đến vé của bạn...</p>
        </div>
      ) : (
        <>
          <div className="spinner" style={{ width: 40, height: 40, borderTopColor: '#00B46E' }}></div>
          <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'sans-serif' }}>Đang xác nhận kết quả thanh toán...</p>
        </>
      )}
      <style>{`
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: #00B46E;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function PaymentRedirect() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RedirectHandler />
    </Suspense>
  );
}
