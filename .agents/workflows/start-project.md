---
description: Start the entire project (Docker, Backend, Frontend)
---
// turbo-all

## Start Project

1. Start Docker services (Redis + RabbitMQ):
```powershell
docker-compose up -d
```

2. Start Spring Boot backend (requires JDK 17):
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"; & ".\mvnw.cmd" spring-boot:run
```
Note: This runs in background on port 8080. Wait ~30s for full startup.
The DataInitializer will automatically seed the database if it's empty.

3. Start Next.js frontend:
```powershell
cd frontend && npm run dev
```
Note: This runs on port 3000.

4. Open the app in browser at http://localhost:3000

## Default Credentials
- **Admin**: admin@ticketbox.vn / admin123
- **Students**: a.nguyen@student.hcmut.edu.vn / admin123 (and other student accounts)

## Data Safety
- Database data is stored in MySQL on disk — it persists between restarts.
- `application.yml` uses `ddl-auto: update` — tables are never dropped.
- `DataInitializer.java` automatically seeds data if the database is empty.
- If you ever need to reset data manually: run `src/main/resources/db/data.sql` via MySQL.

## Troubleshooting
- If backend fails with JAVA_HOME error: Make sure JDK 17 is installed at the path above
- If Redis/RabbitMQ fails: Make sure Docker Desktop is running
- If frontend shows "Lỗi kết nối server": Log out and log back in (token expired)
- If database is empty: DataInitializer will auto-seed on next backend startup
