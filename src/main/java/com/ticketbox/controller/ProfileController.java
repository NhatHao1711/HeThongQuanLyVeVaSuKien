package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.User;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("fullName", user.getFullName());
        profile.put("email", user.getEmail());
        profile.put("phone", user.getPhone());
        profile.put("avatarUrl", user.getAvatarUrl());
        profile.put("role", user.getRole().name());
        profile.put("universityId", user.getUniversity() != null ? user.getUniversity().getId() : null);
        profile.put("universityName", user.getUniversity() != null ? user.getUniversity().getName() : null);
        profile.put("createdAt", user.getCreatedAt());

        return ResponseEntity.ok(ApiResponse.success("Thông tin cá nhân", profile));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<String>> updateProfile(Authentication auth,
            @RequestBody Map<String, Object> body) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (body.containsKey("fullName")) user.setFullName((String) body.get("fullName"));
        if (body.containsKey("phone")) user.setPhone((String) body.get("phone"));

        userRepository.save(user);
        log.info("✅ Profile updated for user: {}", user.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", null));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<String>> changePassword(Authentication auth,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Thiếu thông tin"));
        }

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mật khẩu hiện tại không đúng"));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mật khẩu mới phải ít nhất 6 ký tự"));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("🔐 Password changed for user: {}", user.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công", null));
    }

    @PostMapping("/avatar")
    public ResponseEntity<ApiResponse<String>> uploadAvatar(Authentication auth,
            @RequestParam("file") MultipartFile file) throws IOException {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String uploadDir = "uploads/avatars/";
        Files.createDirectories(Paths.get(uploadDir));

        String ext = getExtension(file.getOriginalFilename());
        String filename = "avatar_" + user.getId() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
        Path filePath = Paths.get(uploadDir + filename);
        Files.write(filePath, file.getBytes());

        String url = "/uploads/avatars/" + filename;
        user.setAvatarUrl(url);
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success("Upload thành công", url));
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(dot) : ".jpg";
    }
}
