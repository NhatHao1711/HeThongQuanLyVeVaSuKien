# Hướng Dẫn Quản Lý Dữ Liệu - Event Ticket System

## Tổng Quan

Tài liệu này hướng dẫn Admin **quản lý dữ liệu (universities, events, tickets, categories)** mà không cần truy cập SQL trực tiếp.

---

## Bắt Đầu Nhanh

### 1. **Admin Account**
```
Email: admin@ticketbox.vn
Password: admin123
```

### 2. **API Base URL**
```
http://localhost:8080/api
```

### 3. **Authentication**
Tất cả requests (ngoài Login) cần header:
```
Authorization: Bearer <JWT_TOKEN_FROM_LOGIN>
```

---

## Các Module Quản Lý

### A. **Universities**

#### Danh sách tất cả universites
```http
GET /universities
```

**Response:**
```json
{
  "status": 200,
  "message": "Successfully fetched 8 universities",
  "data": [
    {
      "id": 1,
      "name": "Đại học Bách Khoa TP.HCM",
      "domain": "hcmut.edu.vn",
      "userCount": 2,
      "createdAt": "2024-01-15T10:30:00"
    }
  ]
}
```

#### Tạo University mới
```http
POST /universities/admin/create
```

**Body:**
```json
{
  "name": "Đại học Công Nghiệp TP.HCM",
  "domain": "iuh.edu.vn"
}
```

#### Cập nhật University
```http
PUT /universities/admin/{id}
```

**Body:**
```json
{
  "name": "Đại học Công Nghiệp TP.HCM",
  "domain": "iuh.edu.vn"
}
```

#### Xoá University
```http
DELETE /universities/admin/{id}
```

> Note: Chỉ xoá được nếu không có users liên kết

---

### B. **Event Categories**

#### Danh sách tất cả categories
```http
GET /categories
```

**Response:**
```json
{
  "status": 200,
  "message": "Successfully fetched 8 categories",
  "data": [
    {
      "id": 1,
      "name": "Công Nghệ",
      "description": "Sự kiện công nghệ, lập trình, AI",
      "icon": "💻",
      "eventCount": 1,
      "createdAt": "2024-01-15T10:30:00"
    }
  ]
}
```

#### Tạo Category mới
```http
POST /categories/admin/create
```

**Body:**
```json
{
  "name": "Các sự kiện online",
  "description": "Sự kiện trực tuyến trên Zoom, YouTube",
  "icon": "📹"
}
```

#### Cập nhật Category
```http
PUT /categories/admin/{id}
```

**Body:**
```json
{
  "name": "Các sự kiện online (cập nhật)",
  "description": "Sự kiện trực tuyến trên Zoom, YouTube, Teams",
  "icon": "📹"
}
```

#### Xoá Category
```http
DELETE /categories/admin/{id}
```

> Note: Chỉ xoá được nếu không có events liên kết

---

### C. **Events**

#### Danh sách tất cả events
```http
GET /events
```

**Response:**
```json
{
  "status": 200,
  "message": "Successfully fetched events",
  "data": [
    {
      "id": 1,
      "title": "TechFest 2024",
      "description": "Lễ hội công nghệ lớn nhất TP.HCM...",
      "location": "Tòa nhà Bitexco",
      "startTime": "2024-04-15T08:00:00",
      "endTime": "2024-04-15T17:00:00",
      "status": "PUBLISHED",
      "category": {
        "id": 1,
        "name": "Công Nghệ",
        "icon": "💻"
      },
      "totalTickets": 650,
      "availableTickets": 400,
      "createdAt": "2024-01-15T10:30:00"
    }
  ]
}
```

#### Lấy event theo ID
```http
GET /events/{id}
```

#### Tạo Event mới (Draft)
```http
POST /events/admin/create
```

**Body:**
```json
{
  "title": "AI Workshop 2024",
  "description": "Workshop về AI, Machine Learning, Deep Learning",
  "location": "Tòa nhà FPT, Tp.HCM",
  "startTime": "2024-06-20T09:00:00",
  "endTime": "2024-06-20T17:00:00",
  "categoryId": 1,
  "status": "DRAFT"
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Event created successfully",
  "data": {
    "id": 11,
    "title": "AI Workshop 2024",
    "status": "DRAFT"
  }
}
```

#### Update Event
```http
PUT /events/admin/{id}
```

**Body:**
```json
{
  "title": "AI Workshop 2024 (Updated)",
  "description": "Workshop về AI, ML, Deep Learning, NLP",
  "location": "Tòa nhà FPT, Tp.HCM",
  "startTime": "2024-06-20T09:00:00",
  "endTime": "2024-06-20T17:00:00",
  "categoryId": 1
}
```

#### Publish Event (DRAFT → PUBLISHED)
```http
POST /events/admin/{id}/publish
```

**Response:**
```json
{
  "status": 200,
  "message": "Event published successfully",
  "data": {
    "id": 11,
    "status": "PUBLISHED"
  }
}
```

#### Close Event (PUBLISHED → CLOSED)
```http
POST /events/admin/{id}/close
```

#### Delete Event
```http
DELETE /events/admin/{id}
```

---

### D. **Ticket Types**

#### Lấy ticket types của event
```http
GET /events/{eventId}/ticket-types
```

#### Tạo Ticket Type mới
```http
POST /events/admin/{eventId}/add-ticket-type
```

**Body:**
```json
{
  "name": "Early Bird",
  "price": 200000,
  "totalQuantity": 100
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Ticket type created successfully",
  "data": {
    "id": 51,
    "name": "Early Bird",
    "price": 200000,
    "totalQuantity": 100,
    "availableQuantity": 100
  }
}
```

#### Update Ticket Type
```http
PUT /ticket-types/admin/{ticketTypeId}
```

**Body:**
```json
{
  "name": "Early Bird (Giảm 30%)",
  "price": 140000,
  "totalQuantity": 100
}
```

#### Delete Ticket Type
```http
DELETE /ticket-types/admin/{ticketTypeId}
```

---

## Ví dụ Quy Trình Tạo Sự Kiện Hoàn Chỉnh

### Step 1: Đăng nhập
```http
POST /auth/login
```

**Body:**
```json
{
  "email": "admin@ticketbox.vn",
  "password": "admin123"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "id": 11,
    "email": "admin@ticketbox.vn",
    "fullName": "Admin TicketBox"
  }
}
```

**Save token này để dùng cho các requests tiếp theo**

### Step 2: Tạo Event (Draft)
```http
POST /events/admin/create
Header: Authorization: Bearer <TOKEN>
```

**Body:**
```json
{
  "title": "Summer Tech Camp 2024",
  "description": "Đào tạo lập trình 6 tuần hè cho sinh viên",
  "location": "Công Viên Phần Mềm Quang Trung, Tp.HCM",
  "startTime": "2024-07-01T08:00:00",
  "endTime": "2024-08-15T17:00:00",
  "categoryId": 1,
  "status": "DRAFT"
}
```

Event sẽ được tạo với status `DRAFT` - có thể chỉnh sửa trước khi công bố

### Step 3: Thêm Ticket Types
```http
POST /events/admin/1/add-ticket-type
Header: Authorization: Bearer <TOKEN>
```

**Body:**
```json
{
  "name": "Student Ticket",
  "price": 500000,
  "totalQuantity": 200
}
```

Repeat để thêm nhiều loại ticket:
- Regular: 700000
- VIP (1-on-1 mentoring): 1500000

### Step 4: Publish Event
```http
POST /events/admin/1/publish
Header: Authorization: Bearer <TOKEN>
```

**Response:**
```json
{
  "status": 200,
  "message": "Event published successfully",
  "data": {
    "id": 1,
    "status": "PUBLISHED"
  }
}
```

**Lúc này event có thể nhìn thấy được bởi users!**

---

## 🔍 Truy Vấn & Tìm Kiếm

### Lấy Events theo Category
```http
GET /events?categoryId=1
```

### Lấy Events theo Status
```http
GET /events?status=PUBLISHED
```

### Lấy Universities theo Domain
```http
GET /universities/by-domain/hcmut.edu.vn
```

---

## 📊 Dữ Liệu Mẫu (Seed Data)

Hệ thống đã được populate với:

### **8 Đại Học**
- Đại học Bách Khoa TP.HCM (hcmut.edu.vn)
- Đại học KHTN TP.HCM (hcmus.edu.vn)
- Đại học Kinh Tế TP.HCM (ueh.edu.vn)
- Đại học Sài Gòn (sgu.edu.vn)
- ĐH Công Nghệ Thông Tin (uit.edu.vn)
- Đại học Ngoại Thương (utc.edu.vn)
- ĐH Ngân Hàng TP.HCM (banking.org.vn)
- Đại học Giáo Dục (hpu.edu.vn)

### **8 Event Categories**
| ID | Tên | Icon | Mô Tả |
|----|-----|------|-------|
| 1 | Công Nghệ | 💻 | Sự kiện công nghệ, lập trình, AI |
| 2 | Âm Nhạc | 🎵 | Concert, festival âm nhạc |
| 3 | Thể Thao | ⚽ | Marathon, bóng rổ, thể thao |
| 4 | Nghệ Thuật & Văn Hóa | 🎨 | Triển lãm, văn hóa truyền thống |
| 5 | Kinh Doanh & Startup | 💼 | Startup summit, networking |
| 6 | Giáo Dục | 📚 | Hội thảo, seminar, workshop |
| 7 | Ẩm Thực | 🍽️ | Food festival, tasting |
| 8 | Giải Trí & Gaming | 🎮 | Esports, gaming tournament |

### **10 Sample Events**
1. TechFest 2024 (Category: Công Nghệ)
2. Concert Mỹ Tâm (Category: Âm Nhạc)
3. Music Festival - Fest Chào Xuân (Category: Âm Nhạc)
4. Marathon 2024 (Category: Thể Thao)
5. Basketball Championship (Category: Thể Thao)
6. Triển Lãm Tranh Đương Đại (Category: Nghệ Thuật)
7. Culture Fest (Category: Nghệ Thuật)
8. Startup Summit 2024 (Category: Kinh Doanh)
9. Hội Thảo Tuyển Dụng (Category: Giáo Dục)
10. Street Food Festival (Category: Ẩm Thực)

### **10 Sample Users**
Mỗi user có set interests khác nhau - dùng để matching buddy events

---

## 🛠️ Troubleshooting

### ❌ "Unauthorized" (401)
- Token hết hạn? → Đăng nhập lại
- Quên Authorization header? → Thêm: `Authorization: Bearer <TOKEN>`

### ❌ "Forbidden" (403)
- Bạn không phải Admin?
- Kiểm tra role của user

### ❌ "Cannot delete category with associated events"
- Xoá tất cả events liên kết trước

### ❌ "Database initialization failed"
- Check logs: `tail -f logs/application.log`
- Đảm bảo MySQL đang chạy
- Check connection string trong `application.yml`

---

## 📝 Best Practices

### ✅ Do's
- ✓ Luôn tạo event ở status DRAFT trước
- ✓ Kiểm tra thông tin event đủ trước khi Publish
- ✓ Thêm đủ loại ticket types (Early Bird, Regular, VIP)
- ✓ Đặt categoryId phù hợp để dễ tìm kiếm
- ✓ Sử dụng description chi tiết

### ❌ Don'ts
- ✗ Không publish event có thông tin bị lỗi
- ✗ Không xoá event đang PUBLISHED
- ✗ Không tạo duplicate ticket types
- ✗ Không set price = 0 ngoài free events

---

## 📚 Tài Liệu Thêm

- [API Documentation](./IMPLEMENTATION_GUIDE.md) - Chi tiết tất cả endpoints
- [Architecture](./ARCHITECTURE.md) - Cấu trúc hệ thống
- [Deployment](./DEPLOYMENT.md) - Hướng dẫn deploy
- [Troubleshooting](./TROUBLESHOOTING.md) - Giải quyết các vấn đề thường gặp

---

## 📞 Support

Có lỗi hoặc câu hỏi?
- Check logs: `docker logs <container_id>`
- Review error message trong response
- Kiểm tra database trực tiếp: `mysql -u root -p ticket_db`

**Happy Managing! 🚀**
