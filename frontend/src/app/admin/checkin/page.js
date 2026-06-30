'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiRequest, getUser, isLoggedIn } from '@/lib/api';

const MODE_CONFIG = {
  checkin: {
    label: 'Check-in',
    endpoint: '/checkin/scan',
    action: 'CHECK_IN',
    successTitle: 'Check-in thành công!',
    failTitle: 'Check-in thất bại!',
  },
  checkout: {
    label: 'Check-out',
    endpoint: '/checkin/checkout',
    action: 'CHECK_OUT',
    successTitle: 'Check-out thành công!',
    failTitle: 'Check-out thất bại!',
  },
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN', { hour12: false });
};

export default function CheckinPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [scanMode, setScanMode] = useState('checkin');
  const [clock, setClock] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const html5QrCodeRef = useRef(null);
  const processingRef = useRef(false);
  const selectedCameraIdRef = useRef('');
  const lastScannedTokenRef = useRef('');
  const scanModeRef = useRef('checkin');

  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId;
  }, [selectedCameraId]);

  useEffect(() => {
    scanModeRef.current = scanMode;
  }, [scanMode]);

  useEffect(() => {
    setClock(new Date());
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return undefined;
    }

    const user = getUser();
    if (user?.role !== 'ROLE_ADMIN' && user?.role !== 'ROLE_ORGANIZER') {
      window.location.href = '/';
      return undefined;
    }

    setCurrentUser(user);
    return () => {
      stopCamera();
    };
  }, []);

  const backHref = currentUser?.role === 'ROLE_ADMIN' ? '/admin' : '/agency';
  const backLabel = currentUser?.role === 'ROLE_ADMIN' ? 'Quản trị hệ thống' : 'Kênh đại lý';

  const getModeConfig = (mode = scanModeRef.current) => MODE_CONFIG[mode] || MODE_CONFIG.checkin;

  const getQrConfig = () => ({
    fps: 15,
    qrbox: { width: 280, height: 280 },
    aspectRatio: 1,
    disableFlip: false,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
  });

  const getCameraErrorMessage = (err) => {
    const raw = String(err?.message || err || '');
    if (raw.includes('NotAllowedError') || raw.includes('Permission denied')) {
      return 'Trình duyệt hoặc Windows đang chặn camera. Hãy bấm biểu tượng camera trên thanh địa chỉ, cho phép Camera, rồi thử lại.';
    }
    if (raw.includes('NotFoundError') || raw.includes('Requested device not found')) {
      return 'Không tìm thấy camera trên máy này. Bạn có thể tải ảnh QR lên hoặc dán mã thủ công bên dưới.';
    }
    if (raw.includes('NotReadableError') || raw.includes('Could not start video source')) {
      return 'Camera đang bị ứng dụng khác sử dụng hoặc Windows chưa cấp quyền. Hãy đóng app camera/meeting rồi thử lại.';
    }
    return `Không thể mở camera. ${raw || 'Hãy cho phép trình duyệt truy cập camera.'}`;
  };

  const waitForQrReader = async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!document.getElementById('qr-reader')) {
      throw new Error('QR reader element is not ready');
    }
  };

  const addHistoryEntry = (entry) => {
    setResult(entry);
    setHistory(prev => [entry, ...prev.slice(0, 49)]);
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState?.();
        if (state === 2) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.log('Camera stop error (safe to ignore):', err);
    }
    setScanning(false);
  };

  const handleScan = async (token) => {
    if (!token || !token.trim() || processingRef.current) return;
    const normalizedToken = token.trim();
    if (lastScannedTokenRef.current === normalizedToken) return;

    const mode = scanModeRef.current;
    const modeConfig = getModeConfig(mode);
    lastScannedTokenRef.current = normalizedToken;
    processingRef.current = true;
    setProcessing(true);

    try {
      if (html5QrCodeRef.current?.pause) {
        await html5QrCodeRef.current.pause(true);
      }
    } catch {}

    try {
      const res = await apiRequest(modeConfig.endpoint, {
        method: 'POST',
        body: JSON.stringify({ qrToken: normalizedToken }),
      });

      const data = res.data || {};
      const recordedAt = data.recordedAt || data.checkoutTime || data.checkinTime || new Date();
      const success = !!res.success;

      addHistoryEntry({
        action: data.action || modeConfig.action,
        actionLabel: modeConfig.label,
        time: formatDateTime(recordedAt),
        checkinTime: formatDateTime(data.checkinTime),
        checkoutTime: formatDateTime(data.checkoutTime),
        message: success ? (data.message || res.message || modeConfig.successTitle) : (res.message || modeConfig.failTitle),
        success,
        token: `${normalizedToken.substring(0, 30)}...`,
        attendeeName: data.attendeeName,
        eventTitle: data.eventTitle,
        ticketTypeName: data.ticketTypeName,
      });
    } catch (err) {
      addHistoryEntry({
        action: modeConfig.action,
        actionLabel: modeConfig.label,
        time: formatDateTime(new Date()),
        message: err?.message || 'Lỗi kết nối server',
        success: false,
        token: `${normalizedToken.substring(0, 30)}...`,
      });
    } finally {
      processingRef.current = false;
      setProcessing(false);
      setTimeout(() => {
        lastScannedTokenRef.current = '';
        try {
          if (html5QrCodeRef.current?.resume) {
            html5QrCodeRef.current.resume();
          }
        } catch {}
      }, 1500);
    }
  };

  const startCamera = async (cameraId = selectedCameraIdRef.current) => {
    setCameraLoading(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      setResult(null);
      setScanning(true);
      await waitForQrReader();

      const readerElement = document.getElementById('qr-reader');
      if (readerElement) readerElement.innerHTML = '';

      const html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });
      html5QrCodeRef.current = html5QrCode;

      const availableCameras = await Html5Qrcode.getCameras().catch(() => []);
      setCameras(availableCameras);

      const preferredCameraId =
        cameraId ||
        availableCameras.find(c => /back|rear|environment/i.test(c.label || ''))?.id ||
        availableCameras[0]?.id;

      if (preferredCameraId && preferredCameraId !== selectedCameraIdRef.current) {
        setSelectedCameraId(preferredCameraId);
      }

      const cameraConfigs = preferredCameraId
        ? [
            { deviceId: { exact: preferredCameraId } },
            preferredCameraId,
            { facingMode: { ideal: 'environment' } },
            { facingMode: 'user' },
          ]
        : [
            { facingMode: { ideal: 'environment' } },
            { facingMode: 'environment' },
            { facingMode: 'user' },
          ];

      let lastError = null;
      for (const cameraConfig of cameraConfigs) {
        try {
          await html5QrCode.start(
            cameraConfig,
            getQrConfig(),
            decodedText => handleScan(decodedText),
            () => {}
          );
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (lastError) throw lastError;
    } catch (err) {
      console.error('Camera error:', err);
      await stopCamera();
      setResult({
        action: getModeConfig().action,
        actionLabel: getModeConfig().label,
        time: formatDateTime(new Date()),
        message: getCameraErrorMessage(err),
        success: false,
      });
    } finally {
      setCameraLoading(false);
    }
  };

  const handleCameraChange = async (event) => {
    const cameraId = event.target.value;
    setSelectedCameraId(cameraId);
    selectedCameraIdRef.current = cameraId;
    if (scanning) {
      await startCamera(cameraId);
    }
  };

  const handleImageQrScan = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || processingRef.current) return;

    processingRef.current = true;
    setProcessing(true);
    setResult(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const fileScanner = new Html5Qrcode('qr-file-reader');
      const decodedText = await fileScanner.scanFile(file, false);
      await fileScanner.clear();
      processingRef.current = false;
      setProcessing(false);
      await handleScan(decodedText);
    } catch (err) {
      console.error('QR image scan error:', err);
      addHistoryEntry({
        action: getModeConfig().action,
        actionLabel: getModeConfig().label,
        time: formatDateTime(new Date()),
        message: 'Không đọc được QR từ ảnh này. Hãy chọn ảnh QR rõ hơn hoặc dán mã thủ công.',
        success: false,
        token: file.name,
      });
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();
    handleScan(manualToken);
    setManualToken('');
  };

  const activeMode = getModeConfig(scanMode);
  const successCount = history.filter(h => h.success).length;

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '48px', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: '860px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <Link href={backHref} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>{backLabel}</Link>
                <span> / Xác thực vé</span>
              </div>
              <Link href={backHref} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}>
                Quay lại
              </Link>
            </div>

            <div className="section-header" style={{ marginBottom: '1.25rem' }}>
              <h2>Check-in / Check-out theo thời gian thực</h2>
              <p>Quét QR để ghi nhận giờ vào và giờ ra của từng vé trên hệ thống.</p>
            </div>

            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: '1rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: 6, borderRadius: 12 }}>
                {Object.entries(MODE_CONFIG).map(([mode, config]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setScanMode(mode)}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderRadius: 9,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontWeight: 800,
                      color: scanMode === mode ? '#fff' : '#334155',
                      background: scanMode === mode ? '#00B46E' : 'transparent',
                    }}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Thời gian hệ thống
                </div>
                <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.05rem' }}>
                  {clock ? formatDateTime(clock) : 'Đang đồng bộ...'}
                </div>
              </div>
            </div>

            <div style={{
              background: '#fff', borderRadius: 16, padding: '1.5rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              {!scanning ? (
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Camera {activeMode.label}
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Chọn chế độ ở trên, sau đó mở camera và quét mã QR trên vé.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => startCamera()}
                    disabled={cameraLoading}
                    style={{ padding: '14px 32px', fontSize: '1rem', fontWeight: 800 }}
                  >
                    {cameraLoading ? 'Đang mở camera...' : `Mở Camera & ${activeMode.label}`}
                  </button>
                </div>
              ) : (
                <div>
                  {cameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={handleCameraChange}
                      style={{ marginBottom: '1rem', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                    >
                      {cameras.map((camera, index) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.label || `Camera ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 420,
                    margin: '0 auto',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '3px solid #00B46E',
                    background: '#000',
                    minHeight: 300,
                  }}>
                    <div id="qr-reader" style={{ width: '100%' }} />
                    {processing && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '1.1rem', fontWeight: 800
                      }}>
                        Đang xác thực...
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={stopCamera}
                    style={{ marginTop: '1rem', fontSize: '0.88rem' }}
                  >
                    Tắt Camera
                  </button>
                </div>
              )}
              <div id="qr-file-reader" style={{ display: 'none' }} />
            </div>

            {result && (
              <div style={{
                background: result.success ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${result.success ? '#22c55e' : '#ef4444'}`,
                borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: result.success ? '#16a34a' : '#dc2626', fontWeight: 900 }}>
                  {result.success ? '[Thành công]' : '[Thất bại]'}
                </div>
                <h3 style={{
                  color: result.success ? '#16a34a' : '#dc2626',
                  fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.3rem'
                }}>
                  {result.success ? `${result.actionLabel} thành công!` : `${result.actionLabel} thất bại!`}
                </h3>
                <p style={{ color: result.success ? '#15803d' : '#991b1b', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  {result.message}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.8rem', textAlign: 'left' }}>
                  {result.eventTitle && <InfoPill label="Sự kiện" value={result.eventTitle} />}
                  {result.attendeeName && <InfoPill label="Người tham dự" value={result.attendeeName} />}
                  {result.ticketTypeName && <InfoPill label="Loại vé" value={result.ticketTypeName} />}
                  <InfoPill label="Ghi nhận lúc" value={result.time} />
                  {result.checkinTime && <InfoPill label="Check-in lúc" value={result.checkinTime} />}
                  {result.checkoutTime && <InfoPill label="Check-out lúc" value={result.checkoutTime} />}
                </div>
                {result.token && (
                  <p style={{ color: '#6b7280', fontSize: '0.72rem', fontFamily: 'monospace', marginTop: '0.8rem', wordBreak: 'break-all' }}>
                    Token: {result.token}
                  </p>
                )}
              </div>
            )}

            <div style={{
              background: '#fff', borderRadius: 16, padding: '1.5rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.8rem' }}>Quét không cần camera</h3>
              <label className="btn btn-outline" style={{ display: 'inline-block', marginBottom: '1rem', cursor: 'pointer' }}>
                Tải ảnh QR lên
                <input type="file" accept="image/*" onChange={handleImageQrScan} style={{ display: 'none' }} />
              </label>

              <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.8rem' }}>
                Nhập mã thủ công
              </h3>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Dán mã QR token vào đây..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  style={{ flex: '1 1 260px', fontSize: '0.9rem' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing || !manualToken.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {activeMode.label}
                </button>
              </form>
            </div>

            {history.length > 0 && (
              <div style={{
                background: '#fff', borderRadius: 16, padding: '1.5rem',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontWeight: 900, fontSize: '1.05rem' }}>Lịch sử xác thực vé</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {successCount} / {history.length} thành công
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflow: 'auto' }}>
                  {history.map((item, index) => (
                    <div key={`${item.time}-${index}`} style={{
                      display: 'flex', alignItems: 'center', gap: '0.8rem',
                      padding: '12px 14px', borderRadius: 10,
                      background: item.success ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${item.success ? '#bbf7d0' : '#fecaca'}`
                    }}>
                      <span style={{
                        fontSize: '0.76rem',
                        fontWeight: 900,
                        color: item.success ? '#16a34a' : '#dc2626',
                        minWidth: 86,
                      }}>
                        {item.actionLabel}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.86rem', fontWeight: 700, color: item.success ? '#16a34a' : '#dc2626', margin: 0 }}>
                          {item.message}
                        </p>
                        {(item.attendeeName || item.eventTitle) && (
                          <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '3px 0 0' }}>
                            {[item.attendeeName, item.eventTitle].filter(Boolean).join(' - ')}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.time}</span>
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

function InfoPill({ label, value }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: 800, wordBreak: 'break-word' }}>
        {value || 'Chưa có dữ liệu'}
      </div>
    </div>
  );
}
