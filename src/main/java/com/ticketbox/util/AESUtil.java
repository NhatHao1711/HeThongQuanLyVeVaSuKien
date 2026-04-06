package com.ticketbox.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * AESUtil - Nhiệm vụ C: Mã hóa/giải mã QR token
 *
 * Format plaintext: "{ticketId}_{userId}_{timestamp}"
 * Sử dụng AES/CBC/PKCS5Padding với key 16 bytes.
 */
@Component
public class AESUtil {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";

    @Value("${aes.secret-key}")
    private String secretKey;

    /**
     * Mã hóa plaintext → Base64-encoded ciphertext
     */
    public String encrypt(String plainText) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(
                    secretKey.getBytes(StandardCharsets.UTF_8), "AES");
            // Sử dụng key làm IV (16 bytes) cho đơn giản
            IvParameterSpec ivSpec = new IvParameterSpec(
                    secretKey.getBytes(StandardCharsets.UTF_8));

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);

            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi mã hóa AES", e);
        }
    }

    /**
     * Giải mã Base64-encoded ciphertext → plaintext
     */
    public String decrypt(String cipherText) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(
                    secretKey.getBytes(StandardCharsets.UTF_8), "AES");
            IvParameterSpec ivSpec = new IvParameterSpec(
                    secretKey.getBytes(StandardCharsets.UTF_8));

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);

            byte[] decoded = Base64.getUrlDecoder().decode(cipherText);
            byte[] decrypted = cipher.doFinal(decoded);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi giải mã AES: Token không hợp lệ", e);
        }
    }

    /**
     * Tạo QR token content: "{ticketId}_{userId}_{timestamp}"
     */
    public String generateQrTokenContent(Long ticketId, Long userId) {
        String plainText = ticketId + "_" + userId + "_" + System.currentTimeMillis();
        return encrypt(plainText);
    }
}
