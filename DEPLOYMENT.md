# 🚀 Deployment Guide

## Production Deployment Architecture

```
┌─────────────────────────────────────┐
│        Frontend (Next.js)            │
│    - Hosted on Vercel/Netlify       │
│    - CDN for static assets          │
└──────────────┬──────────────────────┘
               │ API calls (HTTPS)
┌──────────────▼──────────────────────┐
│   API Gateway (Nginx/HAProxy)       │
│    - SSL termination                 │
│    - Load balancing                  │
│    - Rate limiting                   │
└──────────────┬──────────────────────┘
               │
     ┌─────────┼─────────┐
     │         │         │
┌────▼──┐ ┌───▼──┐ ┌───▼──┐
│ Java  │ │ Java │ │ Java │  (Spring Boot instances)
│ 8080  │ │ 8081 │ │ 8082 │
└────┬──┘ └───┬──┘ └──┬───┘
     │        │       │
     └────┬───┴───┬───┘
          │       │
     ┌────▼───────▼────┐
     │   MySQL (RDS)   │
     │   - Replicated  │
     │   - Automated   │
     │     backups     │
     └────────────────┘
     
     ┌────────────────┐
     │  Redis Cluster │
     │  - Sentinel    │
     │  - Replication │
     └────────────────┘
     
     ┌────────────────┐
     │  RabbitMQ      │
     │  - Clustering  │
     │  - Mirrored Q's│
     └────────────────┘
```

---

## Option 1: Deployment on VPS (Ubuntu 22.04)

### Prerequisites
```bash
# SSH into VPS
ssh ubuntu@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Java 17
sudo apt install -y openjdk-17-jdk

# Install Docker
sudo apt install -y docker.io
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt install -y docker-compose

# Verify
java -version
docker --version
```

### Setup Database & Services

```bash
# Create docker-compose.yml
mkdir -p ~/ticketbox
cd ~/ticketbox

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: event_ticket_db
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - ticketbox-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    networks:
      - ticketbox-network

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - ticketbox-network

volumes:
  mysql-data:
  redis-data:
  rabbitmq-data:

networks:
  ticketbox-network:
    driver: bridge
EOF
```

### Setup Application

```bash
# Create .env file
cat > .env << 'EOF'
DB_PASSWORD=SecurePassword123
RABBITMQ_USER=ticketbox
RABBITMQ_PASSWORD=RabbitMQPass123

JAVA_OPTS=-Xmx1024m -Xms512m
JWT_SECRET=YourSuperSecretKeyForJWTTokenGenerationMustBeAtLeast256BitsLong!!2024
AES_SECRET_KEY=ThisIsA16ByteKey

VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
EOF

# Build JAR
mvn clean package -DskipTests

# Create systemd service
sudo tee /etc/systemd/system/ticketbox.service > /dev/null << 'EOF'
[Unit]
Description=Ticket Box Service
After=network.target
After=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ticketbox
Environment="JAVA_OPTS=-Xmx1024m -Xms512m"
ExecStart=/usr/bin/java ${JAVA_OPTS} -jar application.jar
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start services
sudo systemctl daemon-reload
sudo systemctl enable ticketbox
sudo systemctl start ticketbox

# Monitor logs
tail -f /var/log/syslog | grep ticketbox
```

### Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create config
sudo tee /etc/nginx/sites-available/ticketbox > /dev/null << 'EOF'
upstream backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/ticketbox /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Option 2: Docker Container Deployment

### Dockerfile

```dockerfile
FROM openjdk:17-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy JAR
COPY target/event-ticket-system-1.0.0-SNAPSHOT.jar application.jar

# Environment variables
ENV JAVA_OPTS="-Xmx1024m -Xms512m"
ENV SERVER_PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar application.jar"]
```

### Build & Push to Registry

```bash
# Build image
docker build -t ticketbox:1.0.0 .

# Tag for registry
docker tag ticketbox:1.0.0 your-registry.azurecr.io/ticketbox:1.0.0

# Login to registry
docker login your-registry.azurecr.io

# Push
docker push your-registry.azurecr.io/ticketbox:1.0.0
```

---

## Option 3: Kubernetes Deployment

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ticketbox-api
  labels:
    app: ticketbox

spec:
  replicas: 3
  selector:
    matchLabels:
      app: ticketbox
  
  template:
    metadata:
      labels:
        app: ticketbox
    
    spec:
      containers:
      - name: api
        image: your-registry.azurecr.io/ticketbox:1.0.0
        ports:
        - containerPort: 8080
        
        env:
        - name: SPRING_DATASOURCE_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db-url
        - name: SPRING_DATASOURCE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db-password
        - name: JAVA_OPTS
          value: "-Xmx1024m -Xms512m"
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1024Mi"
            cpu: "500m"
        
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: ticketbox-service

spec:
  type: LoadBalancer
  selector:
    app: ticketbox
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

### Deploy

```bash
# Create config & secrets
kubectl create configmap app-config --from-literal=db-url=jdbc:mysql://mysql:3306/event_ticket_db
kubectl create secret generic app-secrets --from-literal=db-password=YourPassword

# Deploy
kubectl apply -f deployment.yaml

# Monitor
kubectl get pods -l app=ticketbox
kubectl logs deployment/ticketbox-api
kubectl describe service ticketbox-service
```

---

## Option 4: AWS Deployment

### RDS (Database)
```bash
aws rds create-db-instance \
    --db-instance-identifier ticketbox-mysql \
    --db-instance-class db.t3.micro \
    --engine mysql \
    --master-username admin \
    --master-user-password YourSecurePassword \
    --allocated-storage 20
```

### ElastiCache (Redis)
```bash
aws elasticache create-cache-cluster \
    --cache-cluster-id ticketbox-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1
```

### EC2 + Load Balancer
```bash
# Launch EC2 instances
# Configure Auto Scaling Group
# Attach Network Load Balancer
# Configure SSL Certificate in ACM
```

---

## Monitoring & Maintenance

### Enable Actuator

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

### Prometheus + Grafana

```bash
# Docker Compose addition
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
```

### Backup Strategy

```bash
# Daily MySQL backup
@daily /usr/local/bin/backup-mysql.sh

# Script content
#!/bin/bash
DATE=$(date +%Y-%m-%d)
mysqldump -u root -p$DB_PASSWORD event_ticket_db > /backups/db-$DATE.sql.gz
```

---

## Rollback Procedures

```bash
# Blue-Green Deployment using Docker Compose
docker-compose up -d ticketbox-green
# Run tests
docker-compose -f docker-compose.yml exec ticketbox-green curl http://localhost:8081/actuator/health
# If OK, switch traffic
# If fail, keep using ticketbox-blue and remove ticketbox-green
```

---

## Performance Optimization

### Database Indexing
```sql
-- Already configured in entity definitions
```

### Caching Strategy
```java
@Cacheable(value = "events", key = "#eventId")
public EventResponse getEventById(Long eventId) { ... }

@CacheEvict(value = "events", key = "#eventId")
public EventResponse updateEvent(Long eventId, ...) { ... }
```

### CDN Setup
- Configure CloudFront for static assets
- Cache API responses (if applicable)
- Use compression (gzip)

---

## Security Hardening

- [ ] SSL/TLS certificates (Let's Encrypt)
- [ ] WAF rules (AWS WAF / Cloudflare)
- [ ] DDoS protection
- [ ] Secrets management (AWS Secrets Manager)
- [ ] Database encryption at rest
- [ ] API rate limiting
- [ ] Regular security patches
- [ ] Penetration testing

---

**Deployment Status: Ready for Production** ✅
