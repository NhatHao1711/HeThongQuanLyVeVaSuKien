# Quick Start Guide - Event Ticket System

## Start In 5 Minutes

### Prerequisites
- Java 17+
- MySQL 8.0+
- Maven 3.8+
- Redis (optional, for distributed lock)
- RabbitMQ (optional, for async processing)

---

## Setup & Run

### Option 1: Using Docker Compose (Recommended)
```bash
# Navigate to project root
cd d:\DOANTN\HeThongQuanLyVeVaSuKien

# Start all services (MySQL, Redis, RabbitMQ, Backend)
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Wait for message: "Database initialized successfully!"
```

**Then access:**
- Application: http://localhost:8080
- API Docs: http://localhost:8080/swagger-ui.html

### Option 2: Local Setup (Without Docker)

#### 1. Start MySQL
```bash
# On Windows (using MySQL Command Line)
mysql -u root -p
# > CREATE DATABASE ticket_db;
# > EXIT;
```

#### 2. Start Redis (if available)
```bash
redis-server
```

#### 3. Start RabbitMQ (if available)
```bash
# On Windows
rabbitmq-server

# Or via Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.8-management-alpine
```

#### 4. Run Backend
```bash
cd backend

# Build
mvn clean package -DskipTests

# Run
mvn spring-boot:run
```

**Or use IDE**
- Open project in IntelliJ IDEA / Eclipse
- Right-click `EventTicketApplication.java` → Run

---

## Verify Setup

### Check Database Initialization
Look for this in logs:
```
Database Initialization Complete
Universities: 8
Users:        10
Events:       10
Ticket Types: Multiple
```

### Test API
```bash
# Login as Admin
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ticketbox.vn",
    "password": "admin123"
  }'

# Get all events
curl http://localhost:8080/api/events

# Get all universities
curl http://localhost:8080/api/universities
```

### Access Database
```bash
# Connect to MySQL
mysql -u root -p ticket_db

# View data
SELECT * FROM universities;
SELECT * FROM events;
SELECT * FROM event_categories;
```

---

## 📱 Add Test Data

### 1. **Login**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ticketbox.vn",
    "password": "admin123"
  }'
```

**Save the token from response**

### 2. **Create Event Category**
```bash
curl -X POST http://localhost:8080/api/categories/admin/create \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WebDeveloper Meetup",
    "description": "Monthly meetup for web developers",
    "icon": "Tech/Programming"
  }'
```

### 3. **Create University**
```bash
curl -X POST http://localhost:8080/api/universities/admin/create \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trường Đại Học ABC",
    "domain": "abc.edu.vn"
  }'
```

### 4. **Create Event**
```bash
curl -X POST http://localhost:8080/api/events/admin/create \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Event",
    "description": "Testing the system",
    "location": "Room 101, Building A",
    "startTime": "2024-06-01T09:00:00",
    "endTime": "2024-06-01T17:00:00",
    "categoryId": 1
  }'
```

### 5. **Publish Event**
```bash
curl -X POST http://localhost:8080/api/events/admin/1/publish \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 6. **Add Ticket Type**
```bash
curl -X POST http://localhost:8080/api/events/admin/1/add-ticket-type \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regular Ticket",
    "price": 100000,
    "totalQuantity": 100
  }'
```

---

## 🎯 Next Steps

### For Development
1. **Read** [DATA_MANAGEMENT_GUIDE.md](./DATA_MANAGEMENT_GUIDE.md) - Learn how to manage data
2. **Read** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Understand all API endpoints
3. **Read** [ARCHITECTURE.md](./ARCHITECTURE.md) - Learn system design

### For Testing
1. Test user registration/login
2. Browse events by category
3. Try booking a ticket
4. Test payment flow (VNPay)
5. Checkin with QR code

### For Frontend (Next.js)
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Visit http://localhost:3000
```

---

## 🐛 Troubleshooting

### Error: "Connection refused: 127.0.0.1:3306"
- MySQL not running
- Check: `mysql -u root -p -e "SELECT 1"`

### Error: "Failed to authenticate with password"
- Wrong MySQL password
- Reset: `mysql -u root -p` → `ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';`

### Error: "Database initialization failed"
- Check logs for details
- Try: `docker-compose logs -f backend`

### Error: "Cannot connect to Redis"
- Redis is optional - system works without it
- But distributed lock won't work
- Start Redis: `docker run -d -p 6379:6379 redis:latest`

### Error: "Cannot connect to RabbitMQ"
- RabbitMQ is optional - system works without it
- But async QR generation won't work
- Start RabbitMQ: See above

---

## 📋 Default Credentials

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@ticketbox.vn | admin123 | ADMIN |
| User 1 | a.nguyen@student.hcmut.edu.vn | password123 | USER |
| User 2 | b.tran@student.hcmut.edu.vn | password123 | USER |
| User 3 | c.pham@student.hcmus.edu.vn | password123 | USER |

---

## 📊 System Overview

```
┌─────────────────────────────────────────────────────┐
│         Event Ticket Management System              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Backend (Java/Spring Boot)     →  MySQL Database  │
│  Port: 8080                                         │
│                                                     │
│  ┌─────────────────────────────┐                   │
│  │ Core Services:              │                   │
│  │ - User Management           │                   │
│  │ - Event Management          │                   │
│  │ - Ticket Booking (w/ Lock)  │                   │
│  │ - VNPay Payment             │                   │
│  │ - QR Check-in               │                   │
│  │ - Buddy Matching            │                   │
│  └─────────────────────────────┘                   │
│                 ↓                                    │
│  ┌─────────────────────────────┐                   │
│  │ External Services:          │                   │
│  │ - Redis (Caching/Lock)      │                   │
│  │ - RabbitMQ (Async Jobs)     │                   │
│  │ - VNPay (Payments)          │                   │
│  └─────────────────────────────┘                   │
│                                                     │
│  Frontend (Next.js/React)                           │
│  Port: 3000                                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎓 Learning Path

```
Week 1: Setup & Exploration
- ✓ Setup development environment
- ✓ Run application locally
- ✓ Explore seed data
- ✓ Test basic API endpoints

Week 2: Data Management
- ✓ Create new universities
- ✓ Create new event categories
- ✓ Create events and ticket types
- ✓ Publish events

Week 3: Testing
- ✓ Register new users
- ✓ Browse and book tickets
- ✓ Test payment flow
- ✓ Test QR check-in

Week 4+: Production
- ✓ Deploy to staging/production
- ✓ Setup monitoring
- ✓ Configure SSL/HTTPS
- ✓ Enable analytics
```

---

## 📚 Documentation

- [📖 Full API Documentation](./IMPLEMENTATION_GUIDE.md)
- [🏗️ Architecture & Design](./ARCHITECTURE.md)
- [🚀 Deployment Guide](./DEPLOYMENT.md)
- [🔧 Troubleshooting Guide](./TROUBLESHOOTING.md)
- [📊 Data Management](./DATA_MANAGEMENT_GUIDE.md)

---

## 🎉 Success!

You should now have:
- ✅ Running backend application
- ✅ Populated database with sample data
- ✅ Admin account ready to manage events
- ✅ Multiple sample events and categories
- ✅ Ready to add custom data

**Next: Read [DATA_MANAGEMENT_GUIDE.md](./DATA_MANAGEMENT_GUIDE.md) to start adding your own data!**

---

## 💡 Tips

- Use **Postman** or **Insomnia** for API testing
- Monitor logs: `docker-compose logs -f backend`
- Reset database: `docker-compose down -v` then `docker-compose up`
- Database backups: regularly backup MySQL

**Happy coding! 🚀**
