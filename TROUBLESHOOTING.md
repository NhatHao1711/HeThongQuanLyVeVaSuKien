# 🐛 Troubleshooting & FAQ

## Common Issues & Solutions

### 1. Redis Connection Error

**Error:** `Connection refused: no further information`

**Solution:**
```bash
# Start Redis
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:latest

# Test connection
redis-cli ping  # Should return "PONG"
```

---

### 2. RabbitMQ Connection Failed

**Error:** `Failed to connect to RabbitMQ server`

**Solution:**
```bash
# Start RabbitMQ
rabbitmq-server

# Or using Docker
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Access Management UI: http://localhost:15672
# Default credentials: guest / guest
```

---

### 3. Database Connection Error

**Error:** `No suitable driver found for jdbc:mysql://...`

**Solution:**
```bash
# Verify MySQL is running
mysql -u root -p

# Check connection string in application.yml
spring.datasource.url: jdbc:mysql://localhost:3306/event_ticket_db?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh

# Ensure mysql-connector dependency in pom.xml
```

---

### 4. JWT Token Expired

**Error:** `401 Unauthorized - Token expired`

**Solution:**
```bash
# Generate new token by login again
POST /api/auth/login

# Token expiration in application.yml
jwt.expiration: 86400000  # 24 hours in ms
```

---

### 5. Distributed Lock Timeout

**Error:** `BadRequestException: Hệ thống đang bận xử lý`

**Cause:** Multiple concurrent requests exceed lock wait time (5 seconds)

**Solution:**
- Adjust timeout in TicketBookingService
- Increase Redis server capacity
- Add request queuing on frontend

```java
private static final long LOCK_WAIT_TIME = 10;  // Increase from 5
private static final long LOCK_LEASE_TIME = 15;  // Increase from 10
```

---

### 6. QR Token Decryption Fails

**Error:** `InvalidQRTokenException: QR Token không hợp lệ`

**Cause:**
- AES secret key mismatch
- QR token expired or corrupted
- Base64 decoding issue

**Solution:**
```yaml
# Ensure AES key is EXACTLY 16 bytes
aes.secret-key: ThisIsA16ByteKey  # Count: T-h-i-s-I-s-A-1-6-B-y-t-e-K-e-y = 16

# Test locally
String plainText = "123_456_1710000000";
String encrypted = aesUtil.encrypt(plainText);
String decrypted = aesUtil.decrypt(encrypted);
assert plainText.equals(decrypted);
```

---

### 7. VNPay HMAC Verification Failed

**Error:** `PaymentVerificationException: Chữ ký số không hợp lệ`

**Cause:**
- Wrong hash secret
- Parameter order incorrect
- Hash calculation error

**Solution:**
```java
// Verify hash calculation
String expectedHash = hmacSHA512(vnpHashSecret, hashData);
String receivedHash = params.get("vnp_SecureHash");

if (!expectedHash.equalsIgnoreCase(receivedHash)) {
    logger.error("Hash mismatch - Expected: {}, Received: {}", 
        expectedHash, receivedHash);
}

// Ensure parameters are sorted alphabetically
Map<String, String> params = new TreeMap<>(allParams);
```

---

### 8. Duplicate Ticket Booking

**Error:** Same user books same ticket multiple times

**Solution:**
- Confirm is the Distributed Lock working?"
- Add database unique constraint
- Implement idempotency token

```java
@Table(name = "orders", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "transaction_ref"})
})
```

---

### 9. Email not sending

**Error:** `Failed to send email`

**Solution:**
```yaml
# Configure Gmail in application.yml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: your-email@gmail.com
    password: your-app-password  # Not regular password!
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true
```

**Get Gmail App Password:**
1. Enable 2-factor authentication on Gmail
2. Generate app password at myaccount.google.com/apppasswords
3. Use app password in application.yml

---

### 10. CORS Issues in Frontend

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
```java
// In SecurityConfig.java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(
        "http://localhost:3000",
        "https://yourdomain.com"
    ));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

---

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for frequent queries
CREATE INDEX idx_event_status ON events(status);
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_order_user ON orders(user_id);
CREATE INDEX idx_ticket_order ON user_tickets(order_id);
```

### Redis Optimization

```yaml
# In application.yml
spring:
  data:
    redis:
      timeout: 2000  # Connection timeout
      lettuce:
        pool:
          max-active: 10
          max-idle: 5
          min-idle: 2
```

### Connection Pool

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

---

## Monitoring & Logging

### Enable Debug Logging

```yaml
logging:
  level:
    com.ticketbox: DEBUG
    org.springframework.security: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

### Monitor Redis Connections

```bash
# In Redis CLI
redis-cli info stats
redis-cli monitor
```

### Monitor RabbitMQ Queues

```bash
# RabbitMQ Dashboard: http://localhost:15672
# View queue messages, consumers, etc.
```

---

## Deployment Checklist

- [ ] Set secure JWT secret (256+ bits)
- [ ] Set secure AES key (16 bytes)
- [ ] Configure VNPay production credentials
- [ ] Set strong database password
- [ ] Enable HTTPS on production
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable Redis persistence (RDB/AOF)
- [ ] Configure RabbitMQ clustering
- [ ] Set up application logging (ELK stack)
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Test disaster recovery

---

## Support

For additional help:
- Check Spring Boot logs: `tail -f logs/app.log`
- Monitor metrics: `http://localhost:8080/actuator`
- Enable SQL logging to verify queries
- Use Postman for API testing
