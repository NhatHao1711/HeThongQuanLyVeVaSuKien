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

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className={beVietnamPro.className}>
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
