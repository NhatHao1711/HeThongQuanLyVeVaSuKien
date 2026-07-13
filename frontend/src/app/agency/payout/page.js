'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { apiRequest, isLoggedIn } from '@/lib/api';
import { showPopup } from '@/components/GlobalPopup';

export default function PayoutDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    bankName: 'Vietcombank',
    bankAccountName: '',
    bankAccountNumber: ''
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await apiRequest('/profile');
      if (res.success) {
        setProfile(res.data);
        if (res.data.role !== 'ROLE_ORGANIZER' && res.data.role !== 'ROLE_ADMIN') {
          router.push('/');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    if (parseFloat(payoutForm.amount) > (profile?.balance || 0)) {
      showPopup('Số dư khả dụng không đủ!', 'error');
      return;
    }
    if (parseFloat(payoutForm.amount) < 50000) {
      showPopup('Số tiền rút tối thiểu là 50,000 VND', 'error');
      return;
    }
    
    setFormLoading(true);
    try {
      const res = await apiRequest('/payouts/request', 'POST', {
        amount: parseFloat(payoutForm.amount),
        bankName: payoutForm.bankName,
        bankAccountName: payoutForm.bankAccountName,
        bankAccountNumber: payoutForm.bankAccountNumber
      });
      
      if (res.success) {
        showPopup('Gửi yêu cầu rút tiền thành công. Vui lòng chờ Admin duyệt!', 'success');
        setPayoutForm({ ...payoutForm, amount: '' });
        loadProfile(); // Reload balance
      } else {
        showPopup(res.message || 'Có lỗi xảy ra', 'error');
      }
    } catch (e) {
      showPopup('Lỗi kết nối máy chủ', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải dữ liệu...</div>;
  }

  return (
    <div style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', color: '#1a1a2e', margin: 0 }}>Sổ Cái & Yêu Cầu Rút Tiền</h1>
          <button onClick={() => router.push('/agency')} style={{ background: 'none', border: 'none', color: '#00B46E', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            &larr; Quay lại Dashboard Đại Lý
          </button>
        </div>

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          {/* Sổ cái - Số dư */}
          <div style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" style={{ marginRight: '10px', color: '#00B46E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Sổ Cái Hệ Thống (Ledger)
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ padding: '20px', backgroundColor: 'rgba(0, 180, 110, 0.1)', borderRadius: '10px', border: '1px solid rgba(0, 180, 110, 0.2)' }}>
                <p style={{ fontSize: '14px', color: '#009458', margin: '0 0 5px 0', fontWeight: '600' }}>Số dư khả dụng (Có thể rút)</p>
                <p style={{ fontSize: '28px', color: '#00B46E', margin: 0, fontWeight: 'bold' }}>{formatCurrency(profile?.balance)}</p>
                <p style={{ fontSize: '12px', color: '#009458', margin: '10px 0 0 0' }}>Tiền doanh thu từ các sự kiện đã kết thúc và chốt sổ.</p>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <p style={{ fontSize: '14px', color: '#b45309', margin: '0 0 5px 0', fontWeight: '600' }}>Tiền đang tạm giữ (Holding)</p>
                <p style={{ fontSize: '28px', color: '#d97706', margin: 0, fontWeight: 'bold' }}>{formatCurrency(profile?.holdingBalance)}</p>
                <p style={{ fontSize: '12px', color: '#b45309', margin: '10px 0 0 0' }}>Tiền vé khách đã thanh toán, sẽ được mở khóa sau khi sự kiện kết thúc.</p>
              </div>
            </div>
            
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#555', marginBottom: '15px' }}>Cơ chế & Chính sách thanh toán</h3>
              <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '15px', lineHeight: '1.6', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>Khách hàng thanh toán vé qua VNPay, tiền sẽ vào trạng thái <strong>Tạm giữ</strong>.</li>
                <li style={{ marginBottom: '8px' }}>Hệ thống tự động chia sẻ doanh thu (Split Payment) theo tỷ lệ: Nền tảng <strong>10%</strong> - Đại lý <strong>90%</strong>.</li>
                <li>Sau khi sự kiện kết thúc, tiền được cộng vào <strong>Số dư khả dụng</strong>. Đại lý có thể yêu cầu rút tiền ngay.</li>
              </ul>
            </div>
          </div>

          {/* Form rút tiền */}
          <div style={{ flex: '1 1 400px', backgroundColor: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
              <svg width="24" height="24" style={{ marginRight: '10px', color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
              </svg>
              Tạo Yêu Cầu Rút Tiền (Payout)
            </h2>
            
            <form onSubmit={handlePayoutRequest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Số tiền muốn rút (VND)</label>
                <input 
                  type="number" 
                  required
                  min="50000"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({...payoutForm, amount: e.target.value})}
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
                  placeholder="Nhập số tiền..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Ngân hàng thụ hưởng</label>
                <select 
                  value={payoutForm.bankName}
                  onChange={(e) => setPayoutForm({...payoutForm, bankName: e.target.value})}
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none', backgroundColor: '#fff' }}
                >
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="MBBank">MBBank</option>
                  <option value="ACB">ACB</option>
                  <option value="BIDV">BIDV</option>
                  <option value="VietinBank">VietinBank</option>
                  <option value="TPBank">TPBank</option>
                  <option value="VPBank">VPBank</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Tên chủ tài khoản</label>
                <input 
                  type="text" 
                  required
                  value={payoutForm.bankAccountName}
                  onChange={(e) => setPayoutForm({...payoutForm, bankAccountName: e.target.value.toUpperCase()})}
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none', textTransform: 'uppercase' }}
                  placeholder="VD: NGUYEN VAN A"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Số tài khoản</label>
                <input 
                  type="text" 
                  required
                  value={payoutForm.bankAccountNumber}
                  onChange={(e) => setPayoutForm({...payoutForm, bankAccountNumber: e.target.value})}
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
                  placeholder="Nhập số tài khoản..."
                />
              </div>

              <button 
                type="submit" 
                disabled={formLoading || (profile?.balance || 0) < 50000}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  backgroundColor: ((profile?.balance || 0) < 50000 || formLoading) ? '#a0aec0' : '#2563eb', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  cursor: ((profile?.balance || 0) < 50000 || formLoading) ? 'not-allowed' : 'pointer',
                  marginTop: '10px',
                  boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                }}
              >
                {formLoading ? 'Đang xử lý...' : 'Gửi Yêu Cầu Rút Tiền'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
