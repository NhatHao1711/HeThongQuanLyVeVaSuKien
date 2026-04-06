# 🎫 Hệ Thống Quản Lý Sự Kiện & Bán Vé Online

**Phiên bản:** 1.0.0  
**Mô tả:** Hệ thống áp dụng cho sinh viên toàn thành phố, cho phép tạo/mua vé sự kiện, kết nối bạn bè, và kiểm soát in vé bằng mã QR.

---

## 📋 Mục Lục

1. [Tech Stack](#tech-stack)
2. [Kiến Trúc Cơ Sở Dữ Liệu](#kiến-trúc-cơ-sở-dữ-liệu)
3. [Cấu Trúc Thư Mục](#cấu-trúc-thư-mục)
4. [Các Nhiệm Vụ Chính](#các-nhiệm-vụ-chính)
5. [API Endpoints](#api-endpoints)
6. [Hướng Dẫn Cài Đặt](#hướng-dẫn-cài-đặt)
7. [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Spring Boot 3.2.3
- **Language:** Java 17
- **Security:** Spring Security + JWT (JJWT 0.12.5)
- **Database:** MySQL 8
- **ORM:** Spring Data JPA (Hibernate)

### Caching & Concurrency
- **Redis:** Redisson 3.27.0 (Distributed Lock)
- **Message Queue:** RabbitMQ (Event-driven)

### Authentication & Security
- **JWT:** Json Web Token (Token-based auth)
- **Password:** BCrypt (Bcrypt-based encoding)
- **Encryption:** AES/CBC/PKCS5 (For QR token)

### QR Code & Payment
- **QR Code:** ZXing 3.5.3
- **Payment Gateway:** VNPay (HMAC SHA512)
- **Email:** Spring Mail

### Frontend
- **Framework:** Next.js/React
- **Rendering:** Server-Side Rendering (SSR) để tối ưu SEO
- **Meta Tags:** Open Graph, Structured Data

---

## 📊 Kiến Trúc Cơ Sở Dữ Liệu

### Entity Diagram

```
University (1) ─── (N) User
             ├─── (N) Event ─── (N) TicketType
             ├─── (N) Order ─── (N) UserTicket
             └─── (N) EventBuddy
```

### Entities Chi Tiết

#### **University**
```sql
CREATE TABLE universities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **User**
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    university_id BIGINT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    interests_tags JSON,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (university_id) REFERENCES universities(id)
);
```

#### **Event**
```sql
CREATE TABLE events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'CLOSED') DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **TicketType** 🎫
```sql
CREATE TABLE ticket_types (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    total_quantity INT NOT NULL,
    available_quantity INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

#### **Order** 💳
```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('VNPAY', 'BANK_TRANSFER') DEFAULT 'VNPAY',
    payment_status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
    transaction_ref VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### **UserTicket** 🎟️
```sql
CREATE TABLE user_tickets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    ticket_type_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    qr_token VARCHAR(500) UNIQUE,
    checkin_status ENUM('UNUSED', 'USED') DEFAULT 'UNUSED',
    checkin_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### **EventBuddy** 👥
```sql
CREATE TABLE event_buddies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_event_users (event_id, sender_id, receiver_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);
```

---

## 📁 Cấu Trúc Thư Mục

```
src/main/java/com/ticketbox/
├── config/                           # Configuration classes
│   ├── SecurityConfig.java          # JWT + Spring Security
│   ├── RedissonConfig.java          # Redis Distributed Lock
│   └── RabbitMQConfig.java          # RabbitMQ message broker
├── controller/                       # REST API Controllers
│   ├── AuthController.java          # /api/auth/* (Login/Register)
│   ├── EventController.java         # /api/events/* (Event CRUD)
│   ├── BookingController.java       # /api/bookings/* (Ticket booking)
│   ├── PaymentController.java       # /api/payments/* (VNPay)
│   ├── CheckinController.java       # /api/checkin/* (QR check-in)
│   ├── EventBuddyController.java    # /api/buddies/* (Social)
│   └── TicketController.java        # /api/tickets/* (User tickets)
├── service/                         # Business Logic
│   ├── AuthService.java            # User authentication
│   ├── EventService.java           # Event management
│   ├── TicketBookingService.java   # 🔒 TASK A: Anti over-selling
│   ├── VNPayService.java           # 💳 TASK B: VNPay payment
│   ├── CheckinService.java         # 🔐 TASK C: QR check-in
│   ├── EventBuddyService.java      # 👥 TASK D: Social features
│   ├── TicketService.java          # Ticket utilities
│   ├── TicketFulfillmentService.java # RabbitMQ consumer (generate QR)
│   └── QRCodeService.java          # QR code generation
├── dto/                            # Data Transfer Objects
│   ├── request/
│   │   ├── RegisterRequest.java
│   │   ├── LoginRequest.java
│   │   ├── BookingRequest.java
│   │   ├── PaymentRequest.java
│   │   ├── CheckinRequest.java
│   │   ├── BuddyRequest.java
│   │   ├── CreateEventRequest.java
│   │   └── CreateTicketTypeRequest.java
│   ├── response/
│   │   ├── ApiResponse.java
│   │   ├── AuthResponse.java
│   │   ├── BookingResponse.java
│   │   ├── PaymentUrlResponse.java
│   │   ├── EventResponse.java
│   │   ├── TicketTypeResponse.java
│   │   ├── TicketResponse.java
│   │   ├── EventBuddyResponse.java
│   │   └── ...
│   └── PaymentCompletedMessage.java  # RabbitMQ message
├── entity/                          # JPA Entities
│   ├── University.java
│   ├── User.java
│   ├── Event.java
│   ├── TicketType.java
│   ├── Order.java
│   ├── UserTicket.java
│   └── EventBuddy.java
├── repository/                      # Spring Data JPA Repositories
│   ├── UniversityRepository.java
│   ├── UserRepository.java
│   ├── EventRepository.java
│   ├── TicketTypeRepository.java
│   ├── OrderRepository.java
│   ├── UserTicketRepository.java
│   └── EventBuddyRepository.java
├── security/                        # JWT & Security
│   ├── JwtTokenProvider.java        # JWT generation/validation
│   ├── JwtAuthenticationFilter.java # JWT filter
│   └── CustomUserDetailsService.java# Spring Security UserDetailsService
├── exception/                       # Custom Exceptions
│   ├── BadRequestException.java
│   ├── ResourceNotFoundException.java
│   ├── TicketSoldOutException.java
│   ├── InvalidQRTokenException.java
│   ├── PaymentVerificationException.java
│   └── GlobalExceptionHandler.java  # @RestControllerAdvice
├── util/                            # Utility Classes
│   └── AESUtil.java                 # AES encryption for QR
├── enums/                           # Enumerations
│   ├── EventStatus.java
│   ├── PaymentStatus.java
│   ├── PaymentMethod.java
│   ├── CheckinStatus.java
│   └── BuddyStatus.java
└── EventTicketApplication.java      # Spring Boot entry point

resources/
├── application.yml                  # Application properties
└── db/
    └── migration/                   # (Optional: Flyway migrations)
```

---

## 🚀 Các Nhiệm Vụ Chính

### **📌 TASK A: Chống Over-selling (TicketBookingService)**

**Mục tiêu:** Đảm bảo an toàn dữ liệu khi hàng ngàn sinh viên cùng đặt vé.

**Công nghệ:**
- Redis Distributed Lock (Redisson)
- Database transaction

**Flow:**
```
1. Nhận request đặt vé từ user
   ↓
2. Acquire distributed lock: lock:ticket:{ticketTypeId}
   ├─ Nếu không lấy được → Throw "Hệ thống bận, thử lại"
   └─ Nếu lấy được → Continue
   ↓
3. [CRITICAL SECTION]
   ├─ Load TicketType
   ├─ Check available_quantity >= quantity
   ├─ Deduct: available_quantity -= quantity
   ├─ Save TicketType
   └─ Create Order + UserTickets
   ↓
4. Release distributed lock
   ↓
5. Return BookingResponse
```

**Code Example:**
```java
RLock lock = redissonClient.getLock(LOCK_PREFIX + ticketTypeId);
try {
    boolean isLocked = lock.tryLock(5, 10, TimeUnit.SECONDS);
    if (!isLocked) throw new BadRequestException("Hệ thống bận");
    
    // Critical section
    TicketType ticketType = ticketTypeRepository.findById(ticketTypeId).get();
    ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() - quantity);
    ticketTypeRepository.save(ticketType);
} finally {
    if (lock.isHeldByCurrentThread()) lock.unlock();
}
```

---

### **💳 TASK B: Thanh Toán VNPay (VNPayService)**

**Mục tiêu:** Xử lý thanh toán an toàn, có Idempotency check, kích hoạt RabbitMQ message.

**Công nghệ:**
- HMAC SHA512 (VNPay signature)
- RabbitMQ (Asynchronous ticket fulfillment)
- Database transaction

**Flow:**
```
1. User click "Thanh toán"
   ↓
2. POST /api/payments/create-url
   ├─ Build VNPay params
   ├─ Calculate HMAC SHA512
   └─ Return paymentUrl + transactionRef
   ↓
3. Redirect user to VNPay→ User chuyển tiền
   ↓
4. VNPay callback → GET /api/payments/vnpay-return?vnp_ResponseCode=00&...
   ├─ Verify HMAC signature
   ├─ Check transactionRef tồn tại
   ├─ ⚡ IDEMPOTENCY: If order.paymentStatus == PAID → skip, return success
   ├─ If vnp_ResponseCode == "00" → Set paymentStatus = PAID
   ├─ Publish PaymentCompletedMessage to RabbitMQ
   └─ Return success
```

**Idempotency Pattern:**
```java
// If already processed:
if (order.getPaymentStatus() == PaymentStatus.PAID) {
    log.info("Idempotency: Already PAID, skipping...");
    return true;  // Return success without reprocessing
}
```

**HMAC SHA512 Signature:**
```java
private String hmacSHA512(String key, String data) {
    Mac hmac512 = Mac.getInstance("HmacSHA512");
    SecretKeySpec secretKey = new SecretKeySpec(
        key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
    hmac512.init(secretKey);
    byte[] hash = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
    // Convert to hex string
}
```

---

### **🔐 TASK C: QR Check-in (CheckinService + AESUtil)**

**Mục tiêu:** Sinh mã QR bảo mật, giải mã token, block quét trùng lặp.

**Công nghệ:**
- AES/CBC/PKCS5 encryption (Java Crypto)
- ZXing (QR generation)
- Base64 URL-safe encoding

**Flow:**
```
1. After payment success → RabbitMQ consumer (TicketFulfillmentService)
   ├─ Load all UserTickets for this order
   ├─ For each ticket:
   │  ├─ plaintext = "{ticketId}_{userId}_{timestamp}"
   │  ├─ qrToken = AES_encrypt(plaintext)
   │  └─ Save qrToken to DB
   └─ Generate QR code image from qrToken
   
2. User xem vé → Contains QR image
   
3. Ban tổ chức quét QR → POST /api/checkin/scan
   ├─ Extract QR → qrToken
   ├─ qrToken = decrypt(qrToken)
   ├─ Parse: ticketId, userId, timestamp
   ├─ Validate:
   │  ├─ ticket tồn tại
   │  ├─ userId khớp
   │  ├─ checkinStatus != USED (block trùng lặp)
   │  └─ qrToken matches DB
   ├─ Update: checkinStatus = USED, checkinTime = now
   └─ Return "Check-in thành công"
```

**AES Encryption:**
```java
public String encrypt(String plainText) {
    SecretKeySpec keySpec = new SecretKeySpec(
        secretKey.getBytes(StandardCharsets.UTF_8), "AES");
    IvParameterSpec ivSpec = new IvParameterSpec(
        secretKey.getBytes(StandardCharsets.UTF_8));
    
    Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
    cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
    byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
    
    return Base64.getUrlEncoder().withoutPadding().encodeToString(encrypted);
}
```

---

### **👥 TASK D: Event Buddy (EventBuddyService)**

**Mục tiêu:** Cho phép sinh viên tìm bạn đi chung sự kiện.

**Tính năng:**
- ✉️ Gửi lời mời kết nối
- 👍 Chấp nhận/Từ chối
- 💬 Auto-match: Nếu A gửi cho B, B gửi cho A → tự động match
- 💡 Gợi ý: Danh sách users cùng event chưa kết nối

**Flow:**
```
1. User A → POST /api/buddies/request (eventId, receiverId=B)
   ├─ Check existing request
   ├─ Check reverse request (B → A)
   │  └─ If B pending A → Auto-match, update B status = ACCEPTED
   ├─ Else: Create new EventBuddy (status = PENDING)
   └─ Return response

2. User B → GET /api/buddies/{buddyId}?accept=true
   ├─ Only receiver can respond
   ├─ Update status = ACCEPTED | REJECTED
   └─ Return updated buddy

3. User → GET /api/buddies/event/{eventId}
   ├─ Find all ACCEPTED buddies for this event
   └─ Return list with buddy details

4. User → GET /api/buddies/event/{eventId}/suggestions
   ├─ Query: Users with tickets for this event
   ├─ Exclude: Already connected (in EventBuddy)
   └─ Return list of potential buddy userIds
```

---

## 🔌 API Endpoints

### **Authentication** 🔐

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Đăng ký tài khoản | ❌ |
| POST | `/api/auth/login` | Đăng nhập | ❌ |

### **Events** 🎪

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/events` | Danh sách sự kiện | ❌ |
| GET | `/api/events/{id}` | Chi tiết sự kiện | ❌ |
| GET | `/api/events/{id}/ticket-types` | Loại vé của sự kiện | ❌ |
| POST | `/api/events` | Tạo sự kiện mới | ✅ Admin |
| PUT | `/api/events/{id}` | Cập nhật sự kiện | ✅ Admin |
| PUT | `/api/events/{id}/publish` | Publish sự kiện | ✅ Admin |
| PUT | `/api/events/{id}/close` | Đóng sự kiện | ✅ Admin |
| POST | `/api/events/{id}/ticket-types` | Thêm loại vé | ✅ Admin |

### **Booking & Payment** 🎫💳

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/bookings` | Đặt vé | ✅ User |
| POST | `/api/payments/create-url` | Tạo URL thanh toán VNPay | ✅ User |
| GET | `/api/payments/vnpay-return` | Callback VNPay | ❌ |

### **Check-in** 🎟️

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/checkin/scan` | Quét QR check-in | ✅ Admin |

### **Tickets** 🎫

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/tickets` | Danh sách vé của user | ✅ User |
| GET | `/api/tickets/{id}` | Chi tiết vé + QR code | ✅ User |

### **Social** 👥

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/buddies/request` | Gửi lời mời kết bạn | ✅ User |
| PUT | `/api/buddies/{id}/respond?accept=true\|false` | Phản hồi lời mời | ✅ User |
| GET | `/api/buddies/event/{eventId}` | Danh sách buddy đã match | ✅ User |
| GET | `/api/buddies/event/{eventId}/suggestions` | Gợi ý kết nối | ✅ User |

---

## 📦 Hướng Dẫn Cài Đặt

### **Prerequisites**
- ✅ Java 17+
- ✅ Maven 3.6+
- ✅ MySQL 8+
- ✅ Redis 6+
- ✅ RabbitMQ 3.8+
- ✅ Node.js 18+ (Frontend)

### **Step 1: Clone & Setup Backend**

```bash
# Clone project
git clone <repo-url>
cd HeThongQuanLyVeVaSuKien

# Update application.yml
# - Database: MySQL credentials
# - Redis: host/port
# - RabbitMQ: credentials
# - JWT: secret key
# - VNPay: TMN code & hash secret
# - AES: secret key (16 bytes)

# Build
mvn clean install

# Run
mvn spring-boot:run
```

### **Step 2: Setup Database**

```bash
# Create database
mysql -u root -p
CREATE DATABASE event_ticket_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Hibernate JPA sẽ tự tạo tables từ entities (ddl-auto: update)
```

### **Step 3: Setup Redis & RabbitMQ**

```bash
# Docker (Optional)
docker run -d -p 6379:6379 redis:latest
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### **Step 4: Setup Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

## 📝 Hướng Dẫn Sử Dụng

### **Luồng Người Dùng**

#### **1. Đăng Ký & Đăng Nhập**
```bash
# Register
POST /api/auth/register
{
  "fullName": "Nguyễn Văn A",
  "email": "a@student.edu.vn",
  "password": "SecurePass123",
  "interests_tags": "music,sports",
  "universityId": 1
}

# Login
POST /api/auth/login
{
  "email": "a@student.edu.vn",
  "password": "SecurePass123"
}

# Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "userId": 1,
    "fullName": "Nguyễn Văn A",
    "email": "a@student.edu.vn"
  }
}
```

#### **2. Xem Danh Sách Sự Kiện**
```bash
GET /api/events
# Kết quả: Danh sách sự kiện PUBLIC
```

#### **3. Đặt Vé**
```bash
POST /api/bookings
Authorization: Bearer <token>
{
  "ticketTypeId": 5,
  "quantity": 2
}

# Response
{
  "success": true,
  "data": {
    "orderId": 42,
    "transactionRef": "TXN-ABC123XYZ",
    "totalAmount": 500000,
    "ticketCount": 2,
    "ticketTypeName": "VIP",
    "paymentStatus": "PENDING"
  }
}
```

#### **4. Thanh Toán VNPay**
```bash
POST /api/payments/create-url
Authorization: Bearer <token>
{
  "orderId": 42
}

# Response
{
  "success": true,
  "data": {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Version=2.1.0&...",
    "transactionRef": "TXN-ABC123XYZ"
  }
}

# User redirected to VNPay → Pay → VNPay callback → QR generated → Email sent
```

#### **5. Xem & Download Vé**
```bash
GET /api/tickets
Authorization: Bearer <token>

# Response: Danh sách vé với QR code PNG
[
  {
    "id": 101,
    "orderRef": "TXN-ABC123XYZ",
    "eventTitle": "TechFest 2024",
    "ticketTypeName": "VIP",
    "checkinStatus": "UNUSED",
    "qrCode": "<base64-encoded-png>",
    "createdAt": "2024-03-10T10:30:00"
  }
]
```

#### **6. Tìm Bạn Đi Chung (Event Buddy)**
```bash
# Gợi ý kết nối
GET /api/buddies/event/1/suggestions
Authorization: Bearer <token>

# Gửi lời mời
POST /api/buddies/request
Authorization: Bearer <token>
{
  "eventId": 1,
  "receiverId": 5
}

# Chấp nhận
PUT /api/buddies/42/respond?accept=true
Authorization: Bearer <token>

# Xem danh sách buddy
GET /api/buddies/event/1
Authorization: Bearer <token>
```

#### **7. Check-in Sự Kiện (Ban Tổ Chức)**
```bash
POST /api/checkin/scan
{
  "qrToken": "<encrypted-qr-token>"
}

# Response
{
  "success": true,
  "message": "Check-in thành công! Vé #101 - VIP"
}

# Error: "Vé đã được sử dụng trước đó lúc: ..."
```

---

## 🔒 Security Best Practices

### **JWT Token**
- ✅ Signed with HS512
- ✅ 24 hours expiration
- ✅ Stored in Authorization header

### **Password**
- ✅ BCrypt hashing (strength 12)
- ✅ Never stored in plain text

### **QR Token**
- ✅ AES/CBC/PKCS5 encryption
- ✅ Unique & one-time use

### **Payment**
- ✅ HMAC SHA512 signature verification
- ✅ Idempotency check (prevent double charge)

### **API**
- ✅ CORS enabled (localhost:3000)
- ✅ CSRF disabled (stateless JWT)
- ✅ SQL injection prevention (JPA parameterized queries)

---

## 📡 Environment Variables

```yaml
# application.yml

# Database
spring.datasource.url: jdbc:mysql://localhost:3306/event_ticket_db
spring.datasource.username: root
spring.datasource.password: root

# Redis
spring.data.redis.host: localhost
spring.data.redis.port: 6379

# RabbitMQ
spring.rabbitmq.host: localhost
spring.rabbitmq.port: 5672
spring.rabbitmq.username: guest
spring.rabbitmq.password: guest

# JWT
jwt.secret: YourSuperSecretKeyForJWTTokenGenerationMustBeAtLeast256BitsLong!!2024
jwt.expiration: 86400000

# VNPay
vnpay.tmn-code: YOUR_TMN_CODE
vnpay.hash-secret: YOUR_HASH_SECRET
vnpay.pay-url: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
vnpay.return-url: http://localhost:3000/payment/result

# AES Encryption (MUST BE 16 BYTES)
aes.secret-key: ThisIsA16ByteKey
```

---

## 🧪 Testing

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=TicketBookingServiceTest

# With coverage
mvn test jacoco:report
```

---

## 📚 Dokumentasi Thêm

- [VNPay Integration Guide](https://sandbox.vnpayment.vn/)
- [Spring Security JWT](https://spring.io/guides/gs/securing-rest/)
- [Redisson Documentation](https://redisson.org/)
- [Spring Data JPA](https://spring.io/projects/spring-data-jpa)
- [RabbitMQ Spring Integration](https://spring.io/projects/spring-amqp)

---

## 👥 Authors & Support

- **Project Lead:** Senior Full-stack Engineer
- **Architecture:** Enterprise System Architect
- **Contact:** support@ticketbox.com

---

**Status:** 🟢 Production Ready  
**Last Updated:** 2024-03-17
