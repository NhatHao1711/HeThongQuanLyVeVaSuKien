# Backend Dockerfile
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Copy Maven wrapper and POM first (for dependency caching)
COPY .mvn/ .mvn/
COPY mvnw.cmd pom.xml ./

# Generate Linux-compatible mvnw script (only mvnw.cmd exists on Windows)
RUN printf '#!/bin/sh\nexec java -cp ".mvn/wrapper/maven-wrapper.jar" org.apache.maven.wrapper.MavenWrapperMain "$@"\n' > mvnw && chmod +x mvnw

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline -B

# Copy source and build
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
