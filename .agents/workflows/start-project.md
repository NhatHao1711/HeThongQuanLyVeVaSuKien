---
description: Start the entire project (Docker, Backend, Frontend)
---
// turbo-all

## Start Project

1. Start Docker services (MySQL + Redis + RabbitMQ only, NOT backend/frontend):
```powershell
docker-compose up -d mysql redis rabbitmq
```
Note: Do NOT run `docker-compose up -d` without specifying services — it will try to build backend/frontend containers which is not needed for local dev.

2. Start Spring Boot backend (requires JDK 17):
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"; & ".\mvnw.cmd" spring-boot:run
```
Note: This runs in background on port 8080. Wait ~30s for full startup.
The DataInitializer will automatically seed the database if it's empty.

3. Start Next.js frontend:
```powershell
npm run dev
```
Cwd: `frontend`
Note: This runs on port 3000.

4. Open the app in browser at http://localhost:3000

## Default Credentials
- **Admin**: admin@ticketbox.vn / admin123
- **Students**: a.nguyen@student.hcmut.edu.vn / admin123 (and other student accounts)

## Data Safety
- Database data is stored in MySQL Docker volume — it persists between restarts.
- `application.yml` uses `ddl-auto: update` — tables are never dropped.
- `DataInitializer.java` automatically seeds data if the database is empty.
- If you ever need to reset data manually: run `src/main/resources/db/data.sql` via MySQL.

## Known Issues & Solutions
- **Port 3306 busy**: User has MySQL80 service installed locally. Run `net stop MySQL80` (as Admin) before starting Docker.
- **Encoding/mojibake**: JDBC URL MUST use `characterEncoding=UTF-8` (not `utf8mb4`). MySQL Docker uses `command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --character-set-client-handshake=FALSE`.
- **DataInitializer encoding**: Must have `populator.setSqlScriptEncoding("UTF-8")` or Vietnamese data gets corrupted on Windows.
- **PowerShell `&&`**: PowerShell 5.x doesn't support `&&`. Use separate commands or `;` instead.
- **`docker-compose up -d` fails**: The Dockerfile references `mvnw` (Linux) but only `mvnw.cmd` (Windows) exists. Always use `docker-compose up -d mysql redis rabbitmq` for local dev.

## Troubleshooting
- If backend fails with JAVA_HOME error: Make sure JDK 17 is installed at the path above
- If Redis/RabbitMQ fails: Make sure Docker Desktop is running
- If frontend shows "Lỗi kết nối server": Log out and log back in (token expired)
- If database is empty: DataInitializer will auto-seed on next backend startup
