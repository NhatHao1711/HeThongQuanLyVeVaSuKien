package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.User;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class ForgotPasswordController {

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email không được để trống"));
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Don't reveal whether email exists
            return ResponseEntity.ok(ApiResponse.success(
                    "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.", "OK"));
        }

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1)); // 1 giờ
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), token);

        log.info("🔑 Password reset requested for: {}", email);
        return ResponseEntity.ok(ApiResponse.success(
                "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.", "OK"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");

        if (token == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mật khẩu phải có ít nhất 6 ký tự"));
        }

        User user = userRepository.findByResetToken(token).orElse(null);
        if (user == null || user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ"));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        log.info("🔑 Password reset successful for: {}", user.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công! Hãy đăng nhập lại.", "OK"));
    }
}
