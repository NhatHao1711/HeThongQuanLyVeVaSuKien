'use client';

import { useTranslation } from '@/context/TranslationContext';
import Link from 'next/link';

export default function Footer() {
  const { t } = useTranslation();

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    alert('Cảm ơn bạn đã đăng ký nhận thông báo sự kiện từ TRIVENT!');
  };

  return (
    <footer className="footer-new">
      <div className="container">
        <div className="footer-top">
          {/* Cột 1: Giới thiệu & Liên hệ */}
          <div>
            <div className="footer-brand-title">
              TRI<span>VENT</span>
            </div>
            <p className="footer-desc">
              TRIVENT là nền tảng quản lý sự kiện và bán vé trực tuyến hàng đầu dành cho sinh viên, giúp kết nối các câu lạc bộ, trường đại học với cộng đồng sinh viên năng động.
            </p>
            <div className="footer-contact-info">
              <div className="footer-contact-item">
                <span>Địa chỉ: Hội trường A, Trụ sở chính HUTECH, Bình Thạnh, TP. HCM</span>
              </div>
              <div className="footer-contact-item">
                <span>Điện thoại: +84 28 5445 7777</span>
              </div>
              <div className="footer-contact-item">
                <span>Email: support@trivent.vn</span>
              </div>
            </div>
            
            {/* Mạng xã hội dạng text thuần túy */}
            <div className="footer-social-links" style={{ display: 'flex', gap: '1.25rem', marginTop: '1.25rem' }}>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}>
                Facebook
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}>
                LinkedIn
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500' }}>
                YouTube
              </a>
            </div>
          </div>

          {/* Cột 2: Đường dẫn nhanh */}
          <div>
            <h3 className="footer-col-title">Đường Dẫn Nhanh</h3>
            <ul className="footer-links-list">
              <li><Link href="/">Trang chủ</Link></li>
              <li><Link href="/events">Khám phá sự kiện</Link></li>
              <li><Link href="/calendar">Lịch sự kiện</Link></li>
              <li><Link href="/buddies">Tìm bạn đồng hành</Link></li>
              <li><Link href="/profile">Trang cá nhân</Link></li>
            </ul>
          </div>

          {/* Cột 3: Cho Ban tổ chức */}
          <div>
            <h3 className="footer-col-title">Cho Ban Tổ Chức</h3>
            <ul className="footer-links-list">
              <li><Link href="/agency">Đăng ký làm Đại lý</Link></li>
              <li><Link href="/agency">Kênh quản lý đại lý</Link></li>
              <li><Link href="/agency">Hướng dẫn tạo sự kiện</Link></li>
              <li><Link href="/policies">Chính sách bảo mật</Link></li>
              <li><Link href="/terms">Điều khoản dịch vụ</Link></li>
            </ul>
          </div>

          {/* Cột 4: Đăng ký nhận tin */}
          <div>
            <h3 className="footer-col-title">Nhận Bản Tin</h3>
            <p className="footer-desc" style={{ fontSize: '0.85rem' }}>
              Để lại email của bạn để không bỏ lỡ những cơ hội nhận vé sự kiện miễn phí và các mã ưu đãi độc quyền dành riêng cho sinh viên.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="footer-newsletter-form">
              <input 
                type="email" 
                placeholder="Nhập email của bạn..." 
                className="footer-newsletter-input" 
                required 
              />
              <button type="submit" className="footer-newsletter-btn">
                Đăng Ký
              </button>
            </form>
          </div>
        </div>

        {/* Chân trang */}
        <div className="footer-bottom">
          <div>
            © 2026 TRIVENT. Nền tảng Đồ án tốt nghiệp thực hiện bởi <strong>Hào · Sang · Đức</strong>. All rights reserved.
          </div>
          <div className="footer-bottom-links">
            <Link href="/policies">Chính sách Escrow</Link>
            <Link href="/terms">Điều kiện thanh toán</Link>
            <Link href="/support">Trung tâm hỗ trợ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
