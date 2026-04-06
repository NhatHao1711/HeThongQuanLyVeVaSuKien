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

--------------------------------------------

# 📖 HƯỚNG DẪN SỬ DỤNG GITHUB & DOCKER CHO NHÓM TRIVENT

> Tài liệu này dành cho **tất cả thành viên trong nhóm**, kể cả bạn chưa biết gì về Git hay Docker.
> Đọc từ trên xuống, làm theo từng bước, **đảm bảo chạy được 100%**.

---

# PHẦN 1: CÀI ĐẶT (Chỉ làm 1 lần)

## 1.1 Cài Docker Desktop

Docker giống như một "máy ảo nhẹ" giúp chạy toàn bộ hệ thống chỉ với 1 lệnh.

1. Tải tại: **https://www.docker.com/products/docker-desktop/**
2. Mở file vừa tải → Next → Next → Install
3. Restart máy tính khi được yêu cầu
4. Mở Docker Desktop lên → Chờ cho đến khi **góc dưới bên trái** hiện chữ **"Engine running"**

> ⚠️ **LƯU Ý**: Docker Desktop phải đang mở mỗi khi bạn muốn chạy dự án.

## 1.2 Cài Git

Git là công cụ để tải và đồng bộ code giữa các thành viên.

1. Tải tại: **https://git-scm.com/downloads**
2. Mở file vừa tải → Next → Next → Install (giữ nguyên mặc định)

## 1.3 (Tuỳ chọn) Cài thêm nếu muốn CODE trực tiếp

Nếu bạn chỉ muốn **xem demo** → **KHÔNG CẦN** cài thêm gì.

Nếu bạn muốn **sửa code** → Cài thêm:
- **Visual Studio Code**: https://code.visualstudio.com/
- **JDK 17** (cho backend): https://adoptium.net/
- **Node.js 20** (cho frontend): https://nodejs.org/
- **MySQL 8.0** (database): https://dev.mysql.com/downloads/

---

# PHẦN 2: TẢI VÀ CHẠY DỰ ÁN

## Bước 1: Mở PowerShell / Terminal

- Nhấn phím **Windows**, gõ **PowerShell**, nhấn Enter
- Hoặc trong VS Code: nhấn `` Ctrl + ` ``

## Bước 2: Tải source code về máy

Gõ lệnh sau (copy nguyên dòng):

```
git clone https://github.com/NhatHao1711/HeThongQuanLyVeVaSuKien.git
```

> Lệnh này sẽ tải toàn bộ code về thư mục `HeThongQuanLyVeVaSuKien` trên máy bạn.

## Bước 3: Mở thư mục vừa tải

```
cd HeThongQuanLyVeVaSuKien
```

## Bước 4: Chạy toàn bộ hệ thống

**Đảm bảo Docker Desktop đang mở**, rồi gõ:

```
docker-compose up -d --build
```

> ⏳ **Lần đầu tiên** sẽ mất khoảng 5-10 phút vì Docker cần tải các thành phần.
> Các lần sau chỉ mất khoảng 10-15 giây.

## Bước 5: Mở trình duyệt

Chờ khoảng 1-2 phút sau khi lệnh chạy xong, rồi mở trình duyệt:

| Trang | Link |
|:---|:---|
| 🌐 **Website chính** | **http://localhost:3000** |
| 🔧 API Backend | http://localhost:8080 |
| 📨 RabbitMQ (quản lý hàng đợi) | http://localhost:15672 (user: guest / pass: guest) |

## Bước 6: Đăng nhập

| Vai trò | Email | Mật khẩu |
|:---|:---|:---|
| 👑 **Admin** | `admin@ticketbox.vn` | `admin123` |
| 🎓 **Sinh viên** | `a.nguyen@student.hcmut.edu.vn` | `admin123` |

---

# PHẦN 3: TẮT DỰ ÁN

Khi muốn tắt, gõ lệnh:

```
docker-compose stop
```

Khi muốn mở lại, gõ:

```
docker-compose start
```

> ✅ Dữ liệu **KHÔNG BỊ MẤT** khi tắt. Yên tâm!

---

# PHẦN 4: DÀNH CHO NGƯỜI MUỐN CODE (Phát triển tiếp)

## 4.1 Mở project trong VS Code

```
code .
```

Hoặc mở VS Code → File → Open Folder → chọn thư mục `HeThongQuanLyVeVaSuKien`

## 4.2 Chạy ở chế độ phát triển (hot-reload)

Chế độ này giúp bạn **sửa code → thấy thay đổi ngay** mà không cần build lại.

**Cần cài: JDK 17, Node.js 20, MySQL 8.0** (xem Phần 1.3)

Mở **3 cửa sổ Terminal** trong VS Code:

**Terminal 1** — Chạy Redis + RabbitMQ:
```
docker-compose -f docker-compose.dev.yml up -d
```

**Terminal 2** — Chạy Backend:
```
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
.\mvnw.cmd spring-boot:run
```
> Chờ khoảng 30 giây, khi thấy "Started EventTicketApplication" là thành công.

**Terminal 3** — Chạy Frontend:
```
cd frontend
npm install
npm run dev
```
> Khi thấy "✓ Ready" là thành công. Mở http://localhost:3000

## 4.3 Cấu trúc thư mục (để biết sửa file nào)

```
HeThongQuanLyVeVaSuKien/
│
├── 📂 frontend/                    ← GIAO DIỆN WEB (Next.js)
│   ├── src/app/                    ← Các trang (trang chủ, login, events,...)
│   ├── src/components/             ← Các thành phần dùng chung (Navbar, Footer,...)
│   └── src/lib/api.js              ← Kết nối tới Backend
│
├── 📂 src/main/java/com/ticketbox/ ← BACKEND (Spring Boot)
│   ├── controller/                 ← Nơi nhận request từ frontend
│   ├── service/                    ← Logic xử lý (đặt vé, thanh toán,...)
│   ├── entity/                     ← Bảng trong database
│   ├── repository/                 ← Truy vấn database
│   └── config/                     ← Cấu hình hệ thống
│       └── DataInitializer.java    ← Tự tạo dữ liệu mẫu khi DB trống
│
├── 📂 src/main/resources/
│   ├── application.yml             ← Cấu hình database, Redis, RabbitMQ
│   └── db/data.sql                 ← Dữ liệu mẫu (events, users, vouchers)
│
├── docker-compose.yml              ← Chạy toàn bộ bằng Docker
├── docker-compose.dev.yml          ← Chạy chế độ phát triển
├── Dockerfile                      ← Build backend thành Docker image
└── frontend/Dockerfile             ← Build frontend thành Docker image
```

---

# PHẦN 5: CÁCH ĐỒNG BỘ CODE GIỮA CÁC THÀNH VIÊN

## 5.1 Lấy code mới nhất từ GitHub

Khi có người khác sửa code và đã push lên, bạn chạy:

```
git pull
```

> Giống như nhấn "Tải tin nhắn mới" trong Zalo vậy.

## 5.2 Đẩy code lên GitHub (sau khi bạn sửa xong)

Sau khi sửa code xong, chạy **3 lệnh** theo thứ tự:

```
git add .
git commit -m "Mô tả ngắn gọn thay đổi của bạn"
git push
```

**Ví dụ thực tế:**

Bạn vừa sửa trang đăng nhập:
```
git add .
git commit -m "Fix loi trang dang nhap"
git push
```

Bạn vừa thêm trang mới:
```
git add .
git commit -m "Them trang quan ly su kien"
git push
```

> 💡 **MẸO:** Viết mô tả ngắn gọn, rõ ràng để cả nhóm biết bạn đã sửa gì.

## 5.3 Khi bị LỖI "conflict" (2 người sửa cùng 1 file)

Nếu gặp lỗi khi push, chạy:

```
git pull
```

Nếu Git báo "Merge conflict":
1. Mở file bị conflict (VS Code sẽ highlight bằng màu đỏ/xanh)
2. Chọn giữ code của bạn hoặc code người khác
3. Sau khi sửa xong:

```
git add .
git commit -m "Fix conflict"
git push
```

---

# PHẦN 6: LỖI THƯỜNG GẶP & CÁCH SỬA

| # | Lỗi | Nguyên nhân | Cách sửa |
|:---:|:---|:---|:---|
| 1 | `docker-compose: command not found` | Chưa cài Docker Desktop | Cài Docker Desktop (Phần 1.1) |
| 2 | `Cannot connect to the Docker daemon` | Docker Desktop chưa mở | Mở Docker Desktop, chờ "Engine running" |
| 3 | Truy cập localhost:3000 không được | Hệ thống chưa khởi động xong | Chờ thêm 1-2 phút |
| 4 | `Port 8080 already in use` | Có chương trình khác đang dùng port | Tắt chương trình đó hoặc restart máy |
| 5 | "Phiên đăng nhập đã hết hạn" | Token hết hạn (24 giờ) | Ấn "Đăng xuất" → Đăng nhập lại |
| 6 | `git push` bị từ chối | Có code mới trên GitHub | Chạy `git pull` trước, rồi `git push` |
| 7 | `npm install` bị lỗi | Node.js quá cũ | Cài Node.js phiên bản 20 trở lên |

---

# TÓM TẮT LỆNH HAY DÙNG

```
┌─────────────────────────────────────────────────────────┐
│                    LỆNH THƯỜNG DÙNG                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📥 Tải code lần đầu:                                   │
│     git clone https://github.com/NhatHao1711/           │
│         HeThongQuanLyVeVaSuKien.git                     │
│                                                         │
│  🚀 Chạy toàn bộ:     docker-compose up -d --build     │
│  🛑 Tắt hệ thống:     docker-compose stop              │
│  ▶️ Mở lại:            docker-compose start             │
│                                                         │
│  📥 Lấy code mới:     git pull                          │
│  📤 Đẩy code lên:     git add .                         │
│                        git commit -m "mô tả"            │
│                        git push                         │
│                                                         │
│  🌐 Website:          http://localhost:3000              │
│  👑 Admin:            admin@ticketbox.vn / admin123     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```


---

> 🎓 **TRIVENT** — Đồ án tốt nghiệp | Spring Boot 3 + Next.js 16 + MySQL + Redis + RabbitMQ + Docker
