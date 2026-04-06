# 🎫 TRIVENT - Hệ Thống Quản Lý Sự Kiện & Bán Vé Online

> Nền tảng đặt vé sự kiện dành cho sinh viên — Đồ án tốt nghiệp

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.3-green?logo=springboot)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?logo=mysql)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)

---

## 📋 Yêu Cầu Máy Tính

Bạn **chỉ cần cài 2 thứ**:

| Phần mềm | Link tải | Bắt buộc? |
|:---|:---|:---:|
| **Docker Desktop** | https://www.docker.com/products/docker-desktop/ | ✅ Bắt buộc |
| **Git** | https://git-scm.com/downloads | ✅ Bắt buộc |

> Nếu muốn **code trực tiếp** (không chỉ chạy), cần thêm:
> - **JDK 17**: https://adoptium.net/
> - **Node.js 20+**: https://nodejs.org/
> - **MySQL 8.0**: https://dev.mysql.com/downloads/

---

## 🚀 Bắt Đầu (Dành Cho Thành Viên Mới)

### Bước 1: Clone source code

```bash
git clone https://github.com/<tên-team>/HeThongQuanLyVeVaSuKien.git
cd HeThongQuanLyVeVaSuKien
```

### Bước 2: Mở Docker Desktop

Nhấn đúp mở **Docker Desktop** → Chờ đến khi góc dưới bên trái hiện **"Engine running"** (chấm xanh).

### Bước 3: Chạy toàn bộ hệ thống (1 lệnh)

```bash
docker-compose up -d --build
```

⏳ **Lần đầu** sẽ mất ~5-10 phút để tải image và build. Các lần sau chỉ ~10 giây.

### Bước 4: Truy cập

| Trang | URL |
|:---|:---|
| 🌐 **Website** | http://localhost:3000 |
| 🔧 **API Backend** | http://localhost:8080 |
| 📨 **RabbitMQ Admin** | http://localhost:15672 (guest/guest) |

### Tài khoản đăng nhập

| Vai trò | Email | Mật khẩu |
|:---|:---|:---|
| 👑 Admin | `admin@ticketbox.vn` | `admin123` |
| 🎓 Sinh viên | `a.nguyen@student.hcmut.edu.vn` | `admin123` |

---

## 💻 Dành Cho Lập Trình Viên (Muốn Code & Phát Triển)

Nếu bạn muốn **sửa code** và **thấy thay đổi ngay** (hot-reload), làm theo cách này:

### Cài đặt

1. **JDK 17** — [Adoptium](https://adoptium.net/)
2. **Node.js 20+** — [nodejs.org](https://nodejs.org/)
3. **MySQL 8.0** — [mysql.com](https://dev.mysql.com/downloads/)
4. **Docker Desktop** — [docker.com](https://www.docker.com/products/docker-desktop/)

### Chạy

```bash
# Terminal 1: Redis + RabbitMQ (qua Docker)
docker-compose -f docker-compose.dev.yml up -d

# Terminal 2: Backend (Spring Boot)
# Windows:
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
mvnw.cmd spring-boot:run

# Terminal 3: Frontend (Next.js)
cd frontend
npm install    # chỉ lần đầu
npm run dev
```

### Cấu hình Database

File `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/event_ticket_db
    username: root
    password: root
```

> ⚠️ Đảm bảo MySQL đang chạy với user `root`, password `root`.
> Database `event_ticket_db` sẽ được **tự động tạo**.
> Dữ liệu mẫu sẽ được **tự động nạp** bởi `DataInitializer.java` nếu DB trống.

---

## 📁 Cấu Trúc Project

```
HeThongQuanLyVeVaSuKien/
├── src/main/java/com/ticketbox/     # Backend Java
│   ├── config/                      # Cấu hình (Security, Redis, RabbitMQ)
│   │   └── DataInitializer.java     # Tự động seed dữ liệu
│   ├── controller/                  # REST API endpoints
│   ├── service/                     # Business logic
│   ├── entity/                      # JPA entities
│   ├── repository/                  # Data access
│   ├── dto/                         # Request/Response objects
│   ├── security/                    # JWT authentication
│   └── enums/                       # Enums
├── src/main/resources/
│   ├── application.yml              # Cấu hình ứng dụng
│   └── db/data.sql                  # Dữ liệu mẫu
├── frontend/                        # Frontend Next.js
│   ├── src/app/                     # Pages (App Router)
│   ├── src/components/              # Reusable components
│   └── src/lib/api.js               # API client
├── docker-compose.yml               # Full stack (tất cả trong Docker)
├── docker-compose.dev.yml           # Dev mode (chỉ Redis + RabbitMQ)
├── Dockerfile                       # Backend Docker image
└── frontend/Dockerfile              # Frontend Docker image
```

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js    │────▶│ Spring Boot  │────▶│   MySQL     │
│  Frontend   │     │  Backend     │     │  Database   │
│  :3000      │     │  :8080       │     │  :3306      │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
              ┌─────▼─────┐ ┌─────▼──────┐
              │   Redis   │ │  RabbitMQ  │
              │   :6379   │ │   :5672    │
              │  (Lock)   │ │  (Queue)   │
              └───────────┘ └────────────┘
```

### Tính năng chính

| # | Tính năng | Mô tả |
|:---:|:---|:---|
| 1 | 🔒 **Distributed Lock** | Redis Redisson — chống mua trùng vé |
| 2 | 💳 **VNPay Payment** | Thanh toán online với HMAC SHA512 |
| 3 | 📱 **QR Check-in** | AES encrypted QR code |
| 4 | 🤝 **Event Buddy** | Tìm bạn đi chung sự kiện |
| 5 | 📧 **Email via RabbitMQ** | Gửi email xác nhận async |
| 6 | ⭐ **Review System** | Đánh giá sự kiện |
| 7 | 🎟️ **Voucher System** | Mã giảm giá cho sinh viên |
| 8 | 💺 **Seat Map** | Chọn ghế trực quan |

---

## 🛑 Lệnh Dừng Hệ Thống

```bash
# Dừng tất cả container Docker:
docker-compose down

# Dừng nhưng GIỮ dữ liệu:
docker-compose stop

# Xóa hoàn toàn (kể cả dữ liệu):
docker-compose down -v
```

---

## ❓ Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Cách fix |
|:---|:---|:---|
| `Unable to connect to Docker daemon` | Docker Desktop chưa mở | Mở Docker Desktop, chờ "Engine running" |
| `Port 8080 already in use` | Backend cũ chưa tắt | `Stop-Process -Name java -Force` |
| `Phiên đăng nhập đã hết hạn` | JWT token hết hạn (24h) | Đăng xuất → Đăng nhập lại |
| Database trống | DataInitializer sẽ tự xử lý | Restart backend |
| `npm install` lỗi | Node.js version cũ | Cài Node.js 20+ |

---

## 👥 Đóng Góp

1. Fork repo
2. Tạo branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m "Thêm tính năng XYZ"`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

> 🎓 **TRIVENT** — Đồ án tốt nghiệp | Spring Boot 3 + Next.js 16 + MySQL + Redis + RabbitMQ + Docker
