'use client';
import React, { useState, useEffect } from 'react';

export default function SplitPaymentModal({ orderId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  
  const [myPayOSUrl, setMyPayOSUrl] = useState('');
  const [activeLinkCode, setActiveLinkCode] = useState('');
  const [myPayOSLoading, setMyPayOSLoading] = useState(false);
  const [qrStartTime, setQrStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Vui lòng đăng nhập lại');
        return;
      }
      
      const res = await fetch(`/api/split-payment/dashboard/${orderId}`, {
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (activeLinkCode && data?.links) {
      const link = data.links.find(l => l.paymentLinkCode === activeLinkCode);
      if (link && link.status === 'PAID') {
        alert('🎉 Thanh toán thành công! Vé đã được kích hoạt.');
        setMyPayOSUrl('');
        setActiveLinkCode('');
      }
    }
  }, [data, activeLinkCode]);

  const refreshQr = (myLink) => {
    setMyPayOSLoading(true);
    fetch(`/api/split-payment/${myLink.paymentLinkCode}/pay`, { method: 'POST' })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data.checkoutUrl) {
          setMyPayOSUrl(result.data.checkoutUrl);
          setActiveLinkCode(myLink.paymentLinkCode);
          setQrStartTime(Date.now());
        }
      })
      .catch(err => console.error("Error fetching PayOS link", err))
      .finally(() => setMyPayOSLoading(false));
  };

  useEffect(() => {
    if (!qrStartTime || !myPayOSUrl) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - qrStartTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(timer);
        setMyPayOSUrl(''); // QR expired, close it
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [qrStartTime, myPayOSUrl]);

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
      <div style={overlayStyle}>
        <div style={{...modalStyle, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={overlayStyle}>
        <div style={{...modalStyle, textAlign: 'center', padding: '3rem 2rem'}}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😞</div>
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem' }}>Lỗi truy cập</h2>
          <p style={{ color: '#ef4444', marginBottom: '2rem' }}>{error}</p>
          <button onClick={onClose} style={closeBtnStyle}>Đóng</button>
        </div>
      </div>
    );
  }

  const isCompleted = data?.status === 'COMPLETED';

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Chia sẻ thanh toán
            </h1>
            <p style={{ color: '#475569', fontSize: '1rem', marginTop: '0.5rem', fontWeight: 600 }}>
              Sự kiện: <span style={{ color: '#0f172a' }}>{data?.eventName}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        {/* Success Banner */}
        {isCompleted && (
          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>TẤT CẢ ĐÃ THANH TOÁN THÀNH CÔNG!</h2>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Vé đã được xác nhận và gửi vào email của bạn.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
          {/* Progress Bar */}
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 700, color: '#475569', fontSize: '1.1rem' }}>Tiến độ thanh toán</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>{data?.paidLinks} / {data?.totalLinks}</span>
            </div>
            <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                width: `${data ? (data.paidLinks / data.totalLinks) * 100 : 0}%`,
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Danh sách vé */}
            {data?.links && data.links.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Chi tiết các vé trong nhóm</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.links.map((link, index) => {
                    const isPaid = link.status === 'PAID';
                    const isPayingThis = myPayOSUrl && data.links.indexOf(link) === data.links.findIndex(l => l.paymentLinkCode === myPayOSUrl.split('?')[0]); // wait, I need a state for active link. Let's just use myPayOSUrl globally for now or add a state.
                    
                    // Since I don't want to change too much state logic, I will just add activeLink state if possible, but actually we can just store the active paymentLinkCode.
                    // Let's add a local active link check by storing it in a data attribute or just assume the iframe is rendered globally.
                    // Let's render the iframe globally AT THE TOP if myPayOSUrl is set!
                    
                    return (
                      <div key={link.paymentLinkCode} style={{ 
                        border: '1px solid',
                        borderColor: isPaid ? '#10b981' : '#e2e8f0',
                        background: isPaid ? '#ecfdf5' : '#fff',
                        padding: '1.2rem', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '50%', 
                            background: isPaid ? '#10b981' : '#f1f5f9', 
                            color: isPaid ? '#fff' : '#64748b', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontWeight: 700, fontSize: '1.1rem' 
                          }}>
                            {isPaid ? '✓' : index + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isPaid ? '#065f46' : '#1e293b' }}>
                              {link.ticketTypeName} {link.seatName ? `- Ghế ${link.seatName}` : ''}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.2rem' }}>
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(link.amount)}
                            </div>
                          </div>
                        </div>

                        {isPaid ? (
                          <div style={{ color: '#10b981', fontWeight: 700, background: '#d1fae5', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.9rem' }}>
                            Đã thanh toán
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => refreshQr(link)}
                              style={{
                                background: '#6366f1',
                                color: '#fff',
                                border: 'none',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '99px',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Thanh toán phần này
                            </button>
                            <button
                              onClick={() => handleCopy(link.paymentLinkCode)}
                              style={{
                                background: copied === link.paymentLinkCode ? '#10b981' : '#f1f5f9',
                                color: copied === link.paymentLinkCode ? '#fff' : '#475569',
                                border: 'none',
                                padding: '0.6rem 1.2rem',
                                borderRadius: '99px',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {copied === link.paymentLinkCode ? 'Đã Copy!' : 'Copy Link'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Global Iframe Render */}
            {myPayOSUrl && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '1rem' }}>
                <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Thanh toán qua PayOS</span>
                  <button onClick={() => setMyPayOSUrl('')} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>Đóng</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '0.5rem', background: '#fee2e2', padding: '4px 12px', borderRadius: '50px', fontSize: '0.9rem' }}>
                    Mã QR sẽ làm mới sau: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '450px', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    {myPayOSLoading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
                        <div className="spinner" style={{ width: 30, height: 30 }}></div>
                      </div>
                    )}
                    <iframe src={myPayOSUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PayOS Checkout" />
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem',
  overflowY: 'auto'
};

const modalStyle = {
  background: '#ffffff',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '800px',
  padding: '2.5rem',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  position: 'relative',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const closeBtnStyle = {
  background: '#e2e8f0', color: '#475569', border: 'none', 
  padding: '0.8rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
};
