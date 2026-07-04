import "./globals.css";
import { Be_Vietnam_Pro } from "next/font/google";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata = {
  title: "TRIVENT - Hệ thống quản lý sự kiện & bán vé cho sinh viên",
  description: "Nền tảng đặt vé sự kiện trực tuyến hàng đầu dành cho sinh viên toàn thành phố. Tìm sự kiện, đặt vé nhanh, kết nối bạn bè.",
  openGraph: {
    title: "TRIVENT - Sự kiện dành cho sinh viên",
    description: "Khám phá và đặt vé hàng trăm sự kiện hấp dẫn dành cho sinh viên.",
    type: "website",
  },
};

import { TranslationProvider } from '@/context/TranslationContext';

import GlobalPopup from '@/components/GlobalPopup';
import SupportButtons from '@/components/SupportButtons';

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          window.zaloJSV2 = window.zaloJSV2 || {}; 
          window.ZaloPay = window.ZaloPay || {};
          window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('zaloJSV2')) {
              e.preventDefault();
              e.stopPropagation();
              return true;
            }
          }, true);
        ` }} />
      </head>
      <body className={beVietnamPro.className} suppressHydrationWarning>
        <TranslationProvider>
          {children}
          <GlobalPopup />
          <SupportButtons />
        </TranslationProvider>
      </body>
    </html>
  );
}
