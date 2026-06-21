# 📚 TỔNG QUAN SOURCE CODE — TRIVENT
## Hệ thống Quản lý Vé và Sự kiện cho Sinh viên HUTECH

> **Dành cho buổi báo cáo luận văn** — Đọc file này để nắm toàn bộ kiến trúc và chức năng từng file.

---

## 🏗️ KIẾN TRÚC TỔNG THỂ

```
HeThongQuanLyVeVaSuKien/
├── src/                          ← Backend (Spring Boot)
│   └── main/
│       ├── java/com/ticketbox/   ← Source code Java
│       └── resources/            ← Cấu hình & SQL
├── frontend/                     ← Frontend (Next.js React)
│   └── src/
│       ├── app/                  ← Các trang (Page Routes)
│       ├── components/           ← Component tái sử dụng
│       └── lib/                  ← Hàm tiện ích (API call)
├── docker-compose.dev.yml        ← Chạy Redis + RabbitMQ
├── pom.xml                       ← Khai báo dependency Java
└── HUONG_DAN_NHOM.md             ← Hướng dẫn chạy dự án
```

**Luồng hoạt động chính:**
```
Người dùng (Browser)
    ↓ HTTP Request
Next.js Frontend (localhost:3000)
    ↓ REST API Call
Spring Boot Backend (localhost:8080)
    ↓ JPA/Hibernate
MySQL Database (localhost:3306)
    ↓ Distributed Lock
Redis (localhost:6379)
    ↓ Message Queue
RabbitMQ (localhost:5672)
```

---

## 🔧 BACKEND — Spring Boot (Java 17)

### 📁 `config/` — Cấu hình hệ thống

| File | Chức năng |
|------|-----------|
| `SecurityConfig.java` | Cấu hình Spring Security: phân quyền endpoint (ai được gọi API nào), JWT filter, CORS cho phép Frontend gọi Backend |
| `DataInitializer.java` | Chạy khi khởi động: nếu DB trống thì tự động nạp dữ liệu mẫu từ `data.sql` (sự kiện, tài khoản admin) |
| `SeatInitializer.java` | Chạy SAU DataInitializer: tự động tạo 100 ghế (A01–J10) cho từng loại vé chưa có ghế |
| `RabbitMQConfig.java` | Khai báo Queue & Exchange cho RabbitMQ — dùng để gửi email xác nhận đặt vé bất đồng bộ |
| `RedissonConfig.java` | Cấu hình Redisson client — dùng để tạo Distributed Lock chống overselling |
| `WebConfig.java` | Cấu hình CORS cho phép `localhost:3000` gọi sang `localhost:8080` |

---

### 📁 `entity/` — Database Models (Bảng dữ liệu)

| File | Tương ứng bảng DB | Chức năng |
|------|-------------------|-----------|
| `User.java` | `users` | Người dùng: id, email, mật khẩu, role (ROLE_USER / ROLE_ADMIN), trạng thái xác minh |
| `Event.java` | `events` | Sự kiện: tiêu đề, mô tả, địa điểm, thời gian, ảnh, trạng thái (DRAFT/PUBLISHED/CLOSED) |
| `EventCategory.java` | `event_categories` | Danh mục sự kiện: Âm nhạc, Thể thao, Công nghệ... |
| `TicketType.java` | `ticket_types` | Loại vé của 1 sự kiện: Vé thường / VIP, giá, số lượng còn lại |
| `Seat.java` | `seats` | Ghế ngồi: A01–J10, trạng thái (AVAILABLE/LOCKED/BOOKED), thuộc loại vé nào |
| `Order.java` | `orders` | Đơn hàng: tổng tiền, phương thức thanh toán, trạng thái (PENDING/PAID/FAILED) |
| `UserTicket.java` | `user_tickets` | Vé đã mua: liên kết Order + TicketType + User, có QR token để check-in |
| `Voucher.java` | `vouchers` | Mã giảm giá: % hoặc số tiền cố định, số lần dùng tối đa, hạn sử dụng |
| `EventBuddy.java` | `event_buddies` | Tính năng "Tìm bạn đồng hành": yêu cầu ghép đôi tham dự sự kiện |
| `EventReview.java` | `event_reviews` | Đánh giá sao + bình luận sau khi tham dự sự kiện |
| `FavoriteEvent.java` | `favorite_events` | Danh sách sự kiện yêu thích của người dùng |
| `Notification.java` | `notifications` | Thông báo hệ thống gửi cho người dùng |
| `University.java` | `universities` | Thông tin trường đại học (dùng cho tính năng tìm bạn đồng hành) |

---

### 📁 `controller/` — REST API Endpoints (Cửa vào hệ thống)

| File | Base URL | Chức năng chính |
|------|----------|-----------------|
| `AuthController.java` | `/api/auth` | Đăng ký, đăng nhập, trả JWT token |
| `EventController.java` | `/api/events` | CRUD sự kiện, upload ảnh, publish/close, gửi email marketing |
| `AdminController.java` | `/api/admin` | Dashboard admin: thống kê, quản lý user/sự kiện/đơn hàng, **tạo sơ đồ ghế** |
| `BookingController.java` | `/api/bookings` | Đặt vé: nhận request → lock ghế Redis → tạo Order → phát message RabbitMQ |
| `OrderController.java` | `/api/orders` | Xem lịch sử đơn hàng, thanh toán thủ công, xác nhận đã chuyển khoản |
| `SeatController.java` | `/api/seats` | Lấy danh sách ghế theo loại vé, lock/unlock ghế tạm thời khi đang chọn |
| `TicketController.java` | `/api/tickets` | Xem vé đã mua, download PDF vé |
| `CheckinController.java` | `/api/checkin` | Quét QR code để check-in người tham dự sự kiện |
| `VoucherController.java` | `/api/vouchers` | Áp dụng mã giảm giá, admin tạo/xem voucher |
| `ReviewController.java` | `/api/events/{id}/reviews` | Gửi & xem đánh giá sự kiện |
| `FavoriteController.java` | `/api/favorites` | Thêm/bỏ yêu thích sự kiện |
| `EventBuddyController.java` | `/api/buddies` | Tìm bạn đồng hành, gửi yêu cầu ghép đôi |
| `NotificationController.java` | `/api/notifications` | Lấy thông báo, đánh dấu đã đọc |
| `ProfileController.java` | `/api/profile` | Xem/sửa thông tin cá nhân, đổi mật khẩu, upload avatar |
| `PaymentController.java` | `/api/payment` | Tích hợp VNPay (chưa live), xử lý callback thanh toán |
| `ForgotPasswordController.java` | `/api/auth/forgot-password` | Quên mật khẩu: gửi email OTP, reset mật khẩu |
| `EventCategoryController.java` | `/api/categories` | CRUD danh mục sự kiện |
| `UniversityController.java` | `/api/universities` | Quản lý danh sách trường đại học |

---

### 📁 `service/` — Business Logic (Xử lý nghiệp vụ)

| File | Chức năng |
|------|-----------|
| `AuthService.java` | Đăng ký (mã hóa mật khẩu bcrypt), đăng nhập (kiểm tra + tạo JWT) |
| `TicketBookingService.java` | **Core nghiệp vụ quan trọng nhất**: Đặt vé với Distributed Lock (Redis) + TransactionTemplate để chống Race Condition — đảm bảo không bao giờ bán quá số vé |
| `SeatService.java` | Lấy danh sách ghế (kết hợp DB + Redis để biết ghế nào đang bị hold), lock/unlock ghế tạm 10 phút |
| `EventService.java` | CRUD sự kiện, upload ảnh, thay đổi trạng thái, gửi email marketing |
| `EmailService.java` | Gửi email: xác nhận đặt vé (có QR code), quảng bá sự kiện, reset mật khẩu, nhắc nhở sự kiện sắp diễn ra |
| `CheckinService.java` | Quét QR token → kiểm tra vé hợp lệ → đánh dấu đã check-in |
| `QRCodeService.java` | Tạo mã QR từ token vé, encode thành ảnh PNG đính kèm email |
| `OrderCleanupService.java` | **Scheduled Job**: chạy mỗi 5 phút, tự động hủy đơn hàng PENDING quá 15 phút (giải phóng vé cho người khác) |
| `EventReminderService.java` | **Scheduled Job**: gửi email nhắc nhở trước khi sự kiện diễn ra 24 giờ |
| `VNPayService.java` | Tạo URL thanh toán VNPay, xác thực chữ ký HMAC callback |
| `EventBuddyService.java` | Tìm kiếm và ghép đôi người muốn tìm bạn đồng hành |
| `TicketService.java` | Xem danh sách vé của người dùng, tải PDF vé |
| `TicketFulfillmentService.java` | Consumer RabbitMQ: nhận message từ queue, tạo UserTicket và gửi email xác nhận |

---

### 📁 `security/` — Bảo mật JWT

| File | Chức năng |
|------|-----------|
| `JwtTokenProvider.java` | Tạo JWT token khi đăng nhập, xác thực token (chữ ký, hạn dùng) |
| `JwtAuthenticationFilter.java` | Interceptor: mỗi request đến → đọc header `Authorization: Bearer <token>` → xác thực → inject user vào SecurityContext |
| `CustomUserDetailsService.java` | Spring Security adapter: load thông tin user từ DB theo email |

---

### 📁 `resources/` — Cấu hình & Dữ liệu

| File | Chức năng |
|------|-----------|
| `application.yml` | **Config chính**: kết nối MySQL, Redis, RabbitMQ, email SMTP, JWT secret key, cấu hình JPA |
| `db/data.sql` | **Dữ liệu mẫu**: 5 sự kiện HUTECH, tài khoản admin, 3 voucher mẫu — tự động nạp khi DB trống |

---

## 🎨 FRONTEND — Next.js (React)

### 📁 `app/` — Các trang web

| Thư mục / File | URL | Chức năng |
|----------------|-----|-----------|
| `page.js` | `/` | **Trang chủ**: danh sách sự kiện nổi bật, bộ lọc, tìm kiếm |
| `events/[id]/page.js` | `/events/:id` | **Chi tiết sự kiện**: thông tin, ảnh, countdown timer, **đặt vé + sơ đồ ghế**, đánh giá |
| `admin/page.js` | `/admin` | **Trang quản trị**: dashboard thống kê, CRUD sự kiện, quản lý loại vé, **quản lý sơ đồ ghế**, quản lý user, xác nhận thanh toán, voucher, biểu đồ doanh thu |
| `admin/checkin/page.js` | `/admin/checkin` | **Quét QR check-in**: dùng camera quét mã QR vé, xác nhận người tham dự |
| `login/page.js` | `/login` | Đăng nhập |
| `register/page.js` | `/register` | Đăng ký tài khoản mới |
| `forgot-password/page.js` | `/forgot-password` | Gửi email OTP quên mật khẩu |
| `reset-password/page.js` | `/reset-password` | Nhập OTP + mật khẩu mới |
| `my-orders/page.js` | `/my-orders` | Lịch sử đơn hàng, trạng thái thanh toán, xác nhận chuyển khoản |
| `my-tickets/page.js` | `/my-tickets` | Vé đã mua, xem QR code, download PDF vé |
| `profile/page.js` | `/profile` | Thông tin cá nhân, đổi mật khẩu, upload avatar |
| `favorites/page.js` | `/favorites` | Danh sách sự kiện yêu thích |
| `buddies/page.js` | `/buddies` | Tìm bạn đồng hành tham dự sự kiện |
| `calendar/page.js` | `/calendar` | Lịch sự kiện theo tháng |

---

### 📁 `components/` — Component tái sử dụng

| File | Chức năng |
|------|-----------|
| `Navbar.js` | Thanh điều hướng trên cùng: logo, menu, thông báo, đăng nhập/đăng xuất, chuyển ngôn ngữ VN/EN |
| `Footer.js` | Chân trang |
| `EventCard.js` | Card hiển thị 1 sự kiện trong danh sách: ảnh, tên, thời gian, giá, nút yêu thích |
| `SeatMap.js` | **Component sơ đồ ghế**: hiển thị lưới ghế A01–J10, màu theo trạng thái (trống/đã chọn/đã đặt/đang hold), cho phép click chọn nhiều ghế |
| `CategorySidebar.js` | Sidebar lọc sự kiện theo danh mục |
| `Icons.js` | Thư viện SVG icons dùng trong toàn bộ ứng dụng |

---

### 📁 `lib/` — Hàm tiện ích

| File | Chức năng |
|------|-----------|
| `api.js` | Hàm `apiRequest()`: tự động thêm JWT token vào header, xử lý lỗi 401 (tự logout), base URL `http://localhost:8080/api` |

---

## 🗃️ DATABASE — Sơ đồ quan hệ (ERD)

```
users ──────────────────────────────────────────┐
  │ 1                                            │ N
  │ N                                            │
orders ─────── N user_tickets ─── N ────── ticket_types ─── 1 ── events
                                                                    │ 1
                                                                    │ N
                                                                 event_categories
                                                                    
seats ──── N ─── ticket_types

vouchers ──── N ─── orders

event_reviews ── N ── events
favorite_events ── N ── events  
event_buddies ── N ── events
notifications ── N ── users
universities (standalone)
```

---

## 🔒 LUỒNG ĐẶT VÉ — Quan trọng nhất (Race Condition Safe)

```
1. User click "Đặt vé" → chọn ghế → Frontend gửi POST /api/bookings

2. BookingController nhận request → gọi TicketBookingService

3. TicketBookingService:
   a. Acquire Redis Distributed Lock (chống đặt vé đồng thời)
   b. Kiểm tra số ghế còn đủ không
   c. Tạo Order (status = PENDING)
   d. Trừ availableQuantity trong TicketType
   e. Release Lock
   f. Gửi message vào RabbitMQ queue

4. TicketFulfillmentService (Consumer RabbitMQ):
   a. Nhận message từ queue
   b. Tạo UserTicket cho từng ghế
   c. Generate QR token cho từng vé

5. Admin xác nhận thanh toán → Order chuyển PAID
   → EmailService gửi email xác nhận + QR code đến người dùng

6. OrderCleanupService (mỗi 5 phút):
   → Hủy Order còn PENDING quá 15 phút → trả lại ghế
```

---

## 🛡️ BẢO MẬT

| Cơ chế | Mô tả |
|--------|-------|
| **JWT Token** | Đăng nhập thành công → server cấp token 7 ngày → client đính kèm mọi request |
| **Bcrypt** | Mật khẩu được hash trước khi lưu DB, không lưu plain text |
| **Role-based Access** | `ROLE_USER` chỉ xem/đặt vé; `ROLE_ADMIN` quản lý toàn hệ thống |
| **Redis Lock** | Chống Race Condition khi nhiều người đặt vé cùng lúc |
| **@Max(20)** | Giới hạn tối đa 20 vé mỗi lần đặt để chống spam |
| **CORS** | Chỉ cho phép `localhost:3000` gọi Backend |

---

## ⚙️ CÔNG NGHỆ SỬ DỤNG

| Tầng | Công nghệ | Phiên bản |
|------|-----------|-----------|
| Backend | Spring Boot | 3.2.3 |
| ORM | Hibernate / JPA | - |
| Database | MySQL | 8.x |
| Cache / Lock | Redis + Redisson | 3.27.0 |
| Message Queue | RabbitMQ | - |
| Auth | JWT (JJWT) | 0.12.5 |
| QR Code | ZXing | 3.5.3 |
| Email | JavaMailSender | SMTP |
| Frontend | Next.js | 16.1.7 |
| UI | Vanilla CSS + React | - |
| Container | Docker Compose | - |

---

## 👤 TÀI KHOẢN MẶC ĐỊNH

| Role | Email | Mật khẩu |
|------|-------|-----------|
| **Admin** | `admin@ticketbox.vn` | `admin123` |
| **User test** | `user@test.vn` | `user123` |

---

## 🎯 TÍNH NĂNG NỔI BẬT ĐỂ DEMO NGÀY MAI

1. **Đặt vé có sơ đồ ghế** — Click ghế trực tiếp trên sơ đồ A01–J10
2. **Admin tạo sơ đồ ghế** — Cấu hình số hàng × cột theo ý muốn
3. **Chống Race Condition** — Redis Lock đảm bảo không overselling
4. **Quét QR Check-in** — Camera quét mã QR của vé để vào cổng
5. **Tự động hủy đơn** — Đơn PENDING 15 phút tự hủy, ghế được hoàn trả
6. **Email tự động** — Gửi vé + QR sau khi xác nhận thanh toán
7. **Thống kê doanh thu** — Biểu đồ bar chart theo sự kiện
8. **5 sự kiện HUTECH thực tế** — Ảnh thật từ fanpage trường

---

*✍️ File được tạo tự động bởi AI Assistant — 26/04/2026*
