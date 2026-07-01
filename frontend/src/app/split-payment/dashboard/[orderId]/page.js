'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SplitPaymentDashboard({ params }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const orderId = unwrappedParams.orderId;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const res = await fetch(`http://localhost:8080/api/split-payment/dashboard/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Lỗi khi tải thông tin');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Polling every 5 seconds to update progress
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleCopy = (linkCode) => {
    const url = `${window.location.origin}/split-payment/pay/${linkCode}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(linkCode);
        setTimeout(() => setCopied(''), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(linkCode);
        setTimeout(() => setCopied(''), 2000);
      } catch (err) {}
      document.body.removeChild(textArea);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
          {error}
        </div>
        <Footer />
      </div>
    );
  }

  const progress = (data.paidLinks / data.totalLinks) * 100;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <Navbar />
      <div style={{ flex: 1, padding: '3rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '24px', padding: '3rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 1rem 0' }}>
              Chia sẻ thanh toán
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#64748b', margin: 0 }}>
              Sự kiện: <strong style={{ color: '#0f172a' }}>{data.eventName}</strong>
            </p>
          </div>

          <div style={{ background: '#f1f5f9', borderRadius: '20px', padding: '2rem', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155' }}>Tiến độ thanh toán</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>{data.paidLinks}/{data.totalLinks}</span>
            </div>
            
            <div style={{ height: '16px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${progress}%`, 
                background: 'linear-gradient(90deg, #34d399, #10b981)',
                transition: 'width 0.5s ease-out',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
              }}></div>
            </div>

            {progress === 100 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#ecfdf5', color: '#065f46', borderRadius: '12px', textAlign: 'center', fontWeight: 600, border: '1px solid #a7f3d0' }}>
                🎉 Tuyệt vời! Tất cả đã thanh toán xong. Vé của bạn đã được xác nhận.
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>Các liên kết thanh toán</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.links.map((link, index) => {
                const isPaid = link.status === 'PAID';
                return (
                  <div key={index} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '1.5rem', borderRadius: '16px', border: `2px solid ${isPaid ? '#a7f3d0' : '#e2e8f0'}`,
                    background: isPaid ? '#f0fdf4' : '#fff',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '50%', 
                        background: isPaid ? '#10b981' : '#f1f5f9', color: isPaid ? '#fff' : '#64748b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold'
                      }}>
                        {isPaid ? '✓' : (index + 1)}
                      </div>
                      <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isPaid ? '#065f46' : '#1e293b' }}>
                        {index === 0 ? 'Phần của bạn' : `Phần ${index + 1}`}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.95rem' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(link.amount)}
                      </div>
                    </div>
                  </div>
                  
                  {!isPaid ? (
                    index === 0 ? (
                      <button 
                        onClick={() => router.push(`/split-payment/pay/${link.paymentLinkCode}`)}
                        style={{ 
                          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                          color: '#fff',
                          border: 'none', padding: '0.75rem 1.5rem', borderRadius: '99px',
                          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)'
                        }}
                      >
                        💳 Thanh toán phần của tôi
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleCopy(link.paymentLinkCode)}
                        style={{ 
                          background: copied === link.paymentLinkCode ? '#10b981' : '#f1f5f9',
                          color: copied === link.paymentLinkCode ? '#fff' : '#475569',
                          border: 'none', padding: '0.75rem 1.5rem', borderRadius: '99px',
                          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                      >
                        {copied === link.paymentLinkCode ? 'Đã Copy!' : 'Copy Link'}
                      </button>
                    )
                  ) : (
                    <div style={{ color: '#10b981', fontWeight: 600, padding: '0.75rem 1.5rem' }}>Đã thanh toán</div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
          
        </div>
      </div>
      <Footer />
    </div>
  );
}
