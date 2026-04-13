'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, isLoggedIn, getUser } from '@/lib/api';

export default function CheckinPage() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      setScanning(true);

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          // QR code scanned successfully
          await handleScan(decodedText);
        },
        (errorMessage) => {
          // parse error, ignore
        }
      ).catch(async (err) => {
        // If back camera not available, try front camera
        console.log("Trying front camera...");
        await html5QrCode.start(
          { facingMode: "user" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            await handleScan(decodedText);
          },
          (errorMessage) => {}
        );
      });
    } catch (err) {
      console.error("Camera error:", err);
      setResult({
        time: new Date().toLocaleTimeString('vi-VN'),
        message: 'Không thể mở camera. Hãy cho phép trình duyệt truy cập camera.',
        success: false,
      });
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.log("Camera stop error (safe to ignore):", err);
    }
    setScanning(false);
  };

  const handleScan = async (token) => {
    if (!token || !token.trim() || processing) return;
    setProcessing(true);

    // Pause camera while processing
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.pause(true);
      }
    } catch {}

    try {
      const res = await apiRequest('/checkin/scan', {
        method: 'POST',
        body: JSON.stringify({ qrToken: token.trim() }),
      });

      const entry = {
        time: new Date().toLocaleTimeString('vi-VN'),
        message: res.success ? (res.data || res.message || 'Check-in thành công!') : (res.message || 'Check-in thất bại'),
        success: res.success || false,
        token: token.trim().substring(0, 30) + '...',
      };
      setResult(entry);
      setHistory(prev => [entry, ...prev.slice(0, 49)]);
    } catch (err) {
      const entry = {
        time: new Date().toLocaleTimeString('vi-VN'),
        message: 'Lỗi kết nối server',
        success: false,
        token: token.trim().substring(0, 30) + '...',
      };
      setResult(entry);
      setHistory(prev => [entry, ...prev.slice(0, 49)]);
    } finally {
      setProcessing(false);
      // Resume camera after 2 seconds to avoid double-scan
      setTimeout(() => {
        try {
          if (html5QrCodeRef.current) {
            html5QrCodeRef.current.resume();
          }
        } catch {}
      }, 2000);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleScan(manualToken);
    setManualToken('');
  };

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: '700px' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Link href="/admin" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Quản trị</Link>
                <span> / Quét QR Check-in</span>
              </div>
              <Link href="/admin" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Quay lại</Link>
            </div>

            <div className="section-header">
              <h2>📱 Quét QR Check-in</h2>
              <p>Dùng camera để quét mã QR trên vé</p>
            </div>

            {/* Camera Scanner */}
            <div style={{
              background: '#fff', borderRadius: 16, padding: '1.5rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              {!scanning ? (
                <div>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Nhấn nút bên dưới để mở camera và quét mã QR trên vé
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={startCamera}
                    style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 700 }}
                  >
                    📷 Mở Camera & Quét QR
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 400,
                    margin: '0 auto',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '3px solid #00B46E',
                    background: '#000'
                  }}>
                    <div id="qr-reader" style={{ width: '100%' }}></div>
                    {processing && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '1.1rem', fontWeight: 700
                      }}>
                        ⏳ Đang xử lý...
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={stopCamera}
                    style={{ marginTop: '1rem', fontSize: '0.88rem' }}
                  >
                    ⏹ Tắt Camera
                  </button>
                </div>
              )}
            </div>

            {/* Current Result */}
            {result && (
              <div style={{
                background: result.success ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${result.success ? '#22c55e' : '#ef4444'}`,
                borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                  {result.success ? '✅' : '❌'}
                </div>
                <h3 style={{
                  color: result.success ? '#16a34a' : '#dc2626',
                  fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.3rem'
                }}>
                  {result.success ? 'Check-in thành công!' : 'Check-in thất bại!'}
                </h3>
                <p style={{ color: result.success ? '#15803d' : '#991b1b', fontSize: '0.95rem' }}>
                  {result.message}
                </p>
                {result.token && (
                  <p style={{ color: '#6b7280', fontSize: '0.72rem', fontFamily: 'monospace', marginTop: '0.3rem', wordBreak: 'break-all' }}>
                    Token: {result.token}
                  </p>
                )}
              </div>
            )}

            {/* Manual Input (backup) */}
            <div style={{
              background: '#fff', borderRadius: 16, padding: '1.5rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.8rem' }}>
                ⌨️ Nhập mã thủ công
              </h3>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Dán mã QR token vào đây..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  style={{ flex: 1, fontSize: '0.9rem' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing || !manualToken.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Check-in
                </button>
              </form>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div style={{
                background: '#fff', borderRadius: 16, padding: '1.5rem',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>📋 Lịch sử check-in</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {history.filter(h => h.success).length} / {history.length} thành công
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflow: 'auto' }}>
                  {history.map((h, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.8rem',
                      padding: '10px 14px', borderRadius: 10,
                      background: h.success ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${h.success ? '#bbf7d0' : '#fecaca'}`
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>{h.success ? '✅' : '❌'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: h.success ? '#16a34a' : '#dc2626', margin: 0 }}>
                          {h.message}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
