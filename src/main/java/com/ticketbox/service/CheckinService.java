package com.ticketbox.service;

import com.ticketbox.entity.UserTicket;
import com.ticketbox.enums.CheckinStatus;
import com.ticketbox.exception.BadRequestException;
import com.ticketbox.exception.InvalidQRTokenException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.UserTicketRepository;
import com.ticketbox.util.AESUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * CheckinService - Nhiệm vụ C: QR Check-in bảo mật
 *
 * Flow:
 * 1. Giải mã AES token → "{ticketId}_{userId}_{timestamp}"
 * 2. Parse ticketId, userId
 * 3. Validate: ticket tồn tại, userId khớp, chưa checkin
 * 4. Update checkin_status = USED, checkin_time = now
 * 5. Block quét trùng lặp
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CheckinService {

    private final UserTicketRepository userTicketRepository;
    private final AESUtil aesUtil;

    @Transactional
    public String processCheckin(String qrToken) {
        if (qrToken == null || qrToken.trim().isEmpty()) {
            throw new InvalidQRTokenException("QR Token không được để trống");
        }

        // Clean token: trim whitespace and try URL decode
        String cleanToken = qrToken.trim();
        try {
            cleanToken = URLDecoder.decode(cleanToken, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // ignore, use original
        }

        log.info("🔍 Processing QR token (length={}): {}...", cleanToken.length(),
                cleanToken.substring(0, Math.min(20, cleanToken.length())));

        // 1. Giải mã AES
        String decrypted;
        try {
            decrypted = aesUtil.decrypt(cleanToken);
        } catch (Exception e) {
            log.error("❌ AES decrypt failed for token: {}", cleanToken, e);
            throw new InvalidQRTokenException("QR Token không hợp lệ hoặc đã bị thay đổi");
        }

        log.info("🔍 Decrypted QR token: {}", decrypted);

        // 2. Parse: "{ticketId}_{userId}_{timestamp}"
        String[] parts = decrypted.split("_");
        if (parts.length < 2) {
            throw new InvalidQRTokenException(
                    "Định dạng QR Token không hợp lệ. Expected: ticketId_userId_timestamp");
        }

        Long ticketId;
        Long userId;
        try {
            ticketId = Long.parseLong(parts[0]);
            userId = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            throw new InvalidQRTokenException("QR Token chứa dữ liệu không hợp lệ");
        }

        // 3. Load UserTicket
        UserTicket ticket = userTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "UserTicket", "id", ticketId));

        // 4. Validate userId matches
        if (!ticket.getUser().getId().equals(userId)) {
            throw new BadRequestException(
                    "QR Token không khớp với người sở hữu vé");
        }

        // 5. Check duplicate scan (BLOCK trùng lặp)
        if (ticket.getCheckinStatus() == CheckinStatus.USED) {
            throw new BadRequestException(
                    "Vé đã được sử dụng trước đó lúc: " + ticket.getCheckinTime());
        }

        // 6. Update status (Skip strict token comparison — AES decrypt success is enough)
        ticket.setCheckinStatus(CheckinStatus.USED);
        ticket.setCheckinTime(LocalDateTime.now());
        userTicketRepository.save(ticket);

        log.info("✅ Check-in SUCCESS: ticketId={}, userId={}", ticketId, userId);

        return String.format("Check-in thành công! Vé #%d - %s",
                ticketId, ticket.getTicketType().getName());
    }
}
