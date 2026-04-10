# 📖 HƯỚNG DẪN SỬ DỤNG GITHUB & DOCKER CHO NHÓM TRIVENT

> Tài liệu này dành cho **tất cả thành viên trong nhóm**, kể cả bạn chưa biết gì về Git hay Docker.
> Đọc từ trên xuống, làm theo từng bước, **đảm bảo chạy được 100%**.

---

# PHẦN 1: CÀI ĐẶT (Chỉ làm 1 lần)

## 1.1 Cài Docker Desktop

Docker giống như một "máy ảo nhẹ" giúp chạy Redis, RabbitMQ chỉ với 1 lệnh.

1. Tải tại: **https://www.docker.com/products/docker-desktop/**
2. Mở file vừa tải → Next → Next → Install
3. Restart máy tính khi được yêu cầu
4. Mở Docker Desktop lên → Chờ cho đến khi **góc dưới bên trái** hiện chữ **"Engine running"**

> ⚠️ **LƯU Ý**: Docker Desktop phải đang mở mỗi khi bạn muốn chạy dự án.

## 1.2 Cài Git

Git là công cụ để tải và đồng bộ code giữa các thành viên.

1. Tải tại: **https://git-scm.com/downloads**
2. Mở file vừa tải → Next → Next → Install (giữ nguyên mặc định)

## 1.3 Cài đặt môi trường phát triển

Tất cả thành viên cần cài:
- **Visual Studio Code**: https://code.visualstudio.com/
- **JDK 17** (cho backend): https://adoptium.net/
- **Node.js 20** (cho frontend): https://nodejs.org/
- **MySQL 8.0** (database): https://dev.mysql.com/downloads/

> 💡 MySQL cài trên máy sẽ là database chính. Docker chỉ chạy Redis và RabbitMQ.

---

# PHẦN 2: TẢI DỰ ÁN VỀ MÁY (Chỉ làm 1 lần)

## Bước 1: Mở PowerShell / Terminal

- Nhấn phím **Windows**, gõ **PowerShell**, nhấn Enter
- Hoặc trong VS Code: nhấn `` Ctrl + ` ``

## Bước 2: Tải source code về máy

Gõ lệnh sau (copy nguyên dòng):

```
git clone https://github.com/NhatHao1711/HeThongQuanLyVeVaSuKien.git
```

> Lệnh này sẽ tải toàn bộ code về thư mục `HeThongQuanLyVeVaSuKien` trên máy bạn.

## Bước 3: Mở project trong VS Code

```
cd HeThongQuanLyVeVaSuKien
code .
```

## Bước 4: Cài thư viện frontend (chỉ lần đầu)

```
cd frontend
npm install
```

---

# ⭐ PHẦN 3: CHẠY DỰ ÁN HÀNG NGÀY (QUAN TRỌNG NHẤT)

> 🔴 **ĐỌC KỸ PHẦN NÀY** — Đây là cách chạy đúng, tránh mất dữ liệu!

## Quy trình mỗi ngày mở project:

### Bước 1: Mở Docker Desktop
- Chờ cho đến khi góc dưới trái hiện **"Engine running"**

### Bước 2: Chạy Redis + RabbitMQ (Terminal 1)
Mở Terminal trong VS Code (`` Ctrl + ` ``), gõ:

```
docker-compose -f docker-compose.dev.yml up -d
```

> ✅ Lệnh này CHỈ chạy Redis + RabbitMQ, **KHÔNG chạy MySQL** (vì MySQL đã có trên máy)

### Bước 3: Chạy Backend (Terminal 2)
Mở thêm Terminal mới (nhấn nút **+** trên thanh Terminal), gõ:

```
.\mvnw.cmd spring-boot:run
```

> ⏳ Chờ khoảng 30 giây, khi thấy **"Started EventTicketApplication"** là thành công.

### Bước 4: Chạy Frontend (Terminal 3)
Mở thêm Terminal mới, gõ:

```
cd frontend
npm run dev
```

> Khi thấy **"✓ Ready"** là thành công. Mở **http://localhost:3000**

### Bước 5: Mở trình duyệt

| Trang | Link |
|:---|:---|
| 🌐 **Website chính** | **http://localhost:3000** |
| 🔧 API Backend | http://localhost:8080 |
| 📨 RabbitMQ (quản lý hàng đợi) | http://localhost:15672 (user: guest / pass: guest) |

### Bước 6: Đăng nhập

| Vai trò | Email | Mật khẩu |
|:---|:---|:---|
| 👑 **Admin** | `admin@ticketbox.vn` | `admin123` |
| 🎓 **Sinh viên** | `a.nguyen@student.hcmut.edu.vn` | `admin123` |

---

## 🚫 NHỮNG ĐIỀU KHÔNG ĐƯỢC LÀM

| ❌ KHÔNG LÀM | ✅ LÀM ĐÚNG | Lý do |
|:---|:---|:---|
| `docker-compose up -d --build` | `docker-compose -f docker-compose.dev.yml up -d` | Bản full sẽ tạo MySQL Docker → trùng port 3306 với MySQL trên máy |
| Bấm **Start** trong Docker Desktop | Dùng lệnh terminal ở trên | Docker Desktop có thể start nhầm MySQL container |
| `net stop MySQL80` | Không cần tắt MySQL | Tắt MySQL local sẽ khiến backend không kết nối được database |
| `docker-compose down -v` | `docker-compose -f docker-compose.dev.yml down` | Flag `-v` sẽ **XÓA** toàn bộ dữ liệu Docker volumes |

---

# PHẦN 4: TẮT DỰ ÁN

Khi làm xong, tắt theo thứ tự:

1. **Frontend**: Nhấn `Ctrl + C` trong Terminal 3
2. **Backend**: Nhấn `Ctrl + C` trong Terminal 2
3. **Redis + RabbitMQ**: Gõ trong Terminal 1:

```
docker-compose -f docker-compose.dev.yml stop
```

Lần sau mở lại, chỉ cần làm lại **Phần 3** từ đầu.

> ✅ Dữ liệu **KHÔNG BỊ MẤT** khi tắt. Yên tâm!

---

# PHẦN 5: CẤU TRÚC THƯ MỤC (để biết sửa file nào)

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
├── docker-compose.yml              ← ❌ KHÔNG DÙNG (bản full, có MySQL)
├── docker-compose.dev.yml          ← ✅ DÙNG CÁI NÀY (chỉ Redis + RabbitMQ)
├── Dockerfile                      ← Build backend thành Docker image
└── frontend/Dockerfile             ← Build frontend thành Docker image
```

---

# PHẦN 6: ĐỒNG BỘ CODE GIỮA CÁC THÀNH VIÊN

## 6.1 Lấy code mới nhất từ GitHub

Khi có người khác sửa code và đã push lên, bạn chạy:

```
git pull
```

> Giống như nhấn "Tải tin nhắn mới" trong Zalo vậy.

## 6.2 Đẩy code lên GitHub (sau khi bạn sửa xong)

Sau khi sửa code xong, chạy **3 lệnh** theo thứ tự:

```
git add .
git commit -m "Mô tả ngắn gọn thay đổi của bạn"
git push
```

> 💡 **MẸO:** Có thể gộp 3 lệnh thành 1 dòng trong PowerShell (dùng dấu `;`):
> ```
> git add .; git commit -m "Mo ta thay doi"; git push
> ```
> ⚠️ **KHÔNG dùng `&&`** trong PowerShell, sẽ bị lỗi!

**Ví dụ thực tế:**

Bạn vừa sửa trang đăng nhập:
```
git add .; git commit -m "Fix loi trang dang nhap"; git push
```

Bạn vừa thêm trang mới:
```
git add .; git commit -m "Them trang quan ly su kien"; git push
```

> 💡 **MẸO:** Viết mô tả ngắn gọn, rõ ràng để cả nhóm biết bạn đã sửa gì.

## 6.3 Khi bị LỖI "conflict" (2 người sửa cùng 1 file)

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

# PHẦN 7: LỖI THƯỜNG GẶP & CÁCH SỬA

| # | Lỗi | Nguyên nhân | Cách sửa |
|:---:|:---|:---|:---|
| 1 | `docker-compose: command not found` | Chưa cài Docker Desktop | Cài Docker Desktop (Phần 1.1) |
| 2 | `Cannot connect to the Docker daemon` | Docker Desktop chưa mở | Mở Docker Desktop, chờ "Engine running" |
| 3 | `Port 3306 already in use` (Docker) | MySQL trên máy đang chạy → Docker MySQL trùng port | **KHÔNG dùng** `docker-compose.yml`. Dùng `docker-compose -f docker-compose.dev.yml up -d` |
| 4 | Truy cập localhost:3000 không được | Frontend chưa khởi động xong | Chờ thêm 1-2 phút, kiểm tra Terminal 3 |
| 5 | `Port 8080 already in use` | Có chương trình khác đang dùng port | Tắt chương trình đó hoặc restart máy |
| 6 | "Phiên đăng nhập đã hết hạn" | Token hết hạn (24 giờ) | Ấn "Đăng xuất" → Đăng nhập lại |
| 7 | `git push` bị từ chối | Có code mới trên GitHub | Chạy `git pull` trước, rồi `git push` |
| 8 | `npm install` bị lỗi | Node.js quá cũ | Cài Node.js phiên bản 20 trở lên |
| 9 | Database bị mất dữ liệu | Đã chạy `docker-compose.yml` thay vì bản dev | Backend sẽ tự nạp dữ liệu mẫu. Lần sau dùng đúng lệnh ở Phần 3 |

---

# TÓM TẮT LỆNH HAY DÙNG

```
┌─────────────────────────────────────────────────────────────┐
│                    LỆNH THƯỜNG DÙNG                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📥 Tải code lần đầu:                                       │
│     git clone https://github.com/NhatHao1711/               │
│         HeThongQuanLyVeVaSuKien.git                         │
│                                                             │
│  🚀 CHẠY DỰ ÁN (3 Terminal):                               │
│     T1: docker-compose -f docker-compose.dev.yml up -d      │
│     T2: .\mvnw.cmd spring-boot:run                          │
│     T3: cd frontend; npm run dev                            │
│                                                             │
│  🛑 TẮT DỰ ÁN:                                              │
│     T3: Ctrl + C                                            │
│     T2: Ctrl + C                                            │
│     T1: docker-compose -f docker-compose.dev.yml stop       │
│                                                             │
│  📥 Lấy code mới:     git pull                              │
│  📤 Đẩy code lên:                                           │
│     git add .; git commit -m "mô tả"; git push             │
│                                                             │
│  🌐 Website:          http://localhost:3000                  │
│  👑 Admin:            admin@ticketbox.vn / admin123         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
