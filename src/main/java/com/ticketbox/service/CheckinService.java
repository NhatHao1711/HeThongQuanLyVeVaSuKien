package com.ticketbox.service;

import com.ticketbox.dto.response.CheckinScanResponse;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.enums.AgencyStatus;
import com.ticketbox.enums.CheckinStatus;
import com.ticketbox.enums.UserRole;
import com.ticketbox.exception.BadRequestException;
import com.ticketbox.exception.InvalidQRTokenException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.repository.UserTicketRepository;
import com.ticketbox.security.CustomUserDetails;
import com.ticketbox.util.AESUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckinService {

    private final UserTicketRepository userTicketRepository;
    private final UserRepository userRepository;
    private final AESUtil aesUtil;

    @Transactional
    public CheckinScanResponse processCheckin(String qrToken, CustomUserDetails scanner) {
        UserTicket ticket = loadValidTicket(qrToken, scanner);

        if (ticket.getCheckinStatus() == CheckinStatus.USED) {
            throw new BadRequestException("Vé đã được check-in trước đó lúc: " + ticket.getCheckinTime());
        }

        LocalDateTime recordedAt = LocalDateTime.now();
        int updatedRows = userTicketRepository.markUsedOnce(
                ticket.getId(),
                CheckinStatus.USED,
                CheckinStatus.UNUSED,
                recordedAt);

        if (updatedRows != 1) {
            throw new BadRequestException("Vé đã được check-in bởi một thiết bị khác.");
        }

        log.info("Check-in success ticketId={}, scannerId={}, time={}", ticket.getId(), scanner.getId(), recordedAt);

        return buildScanResponse(ticket, "CHECK_IN", recordedAt, null,
                String.format("Check-in thành công! Vé #%d - %s", ticket.getId(), ticket.getTicketType().getName()));
    }

    @Transactional
    public CheckinScanResponse processCheckout(String qrToken, CustomUserDetails scanner) {
        UserTicket ticket = loadValidTicket(qrToken, scanner);

        if (ticket.getCheckinStatus() != CheckinStatus.USED || ticket.getCheckinTime() == null) {
            throw new BadRequestException("Vé chưa check-in, không thể check-out.");
        }

        if (ticket.getCheckoutTime() != null) {
            throw new BadRequestException("Vé đã check-out trước đó lúc: " + ticket.getCheckoutTime());
        }

        LocalDateTime recordedAt = LocalDateTime.now();
        int updatedRows = userTicketRepository.markCheckedOutOnce(ticket.getId(), CheckinStatus.USED, recordedAt);

        if (updatedRows != 1) {
            throw new BadRequestException("Vé đã được check-out bởi một thiết bị khác.");
        }

        log.info("Check-out success ticketId={}, scannerId={}, time={}", ticket.getId(), scanner.getId(), recordedAt);

        return buildScanResponse(ticket, "CHECK_OUT", ticket.getCheckinTime(), recordedAt,
                String.format("Check-out thành công! Vé #%d - %s", ticket.getId(), ticket.getTicketType().getName()));
    }

    private UserTicket loadValidTicket(String qrToken, CustomUserDetails scanner) {
        if (qrToken == null || qrToken.trim().isEmpty()) {
            throw new InvalidQRTokenException("QR Token không được để trống");
        }

        String cleanToken = normalizeQrToken(qrToken);
        log.info("Processing QR token length={}", cleanToken.length());

        String decrypted;
        try {
            decrypted = aesUtil.decrypt(cleanToken);
        } catch (Exception e) {
            log.error("AES decrypt failed for token", e);
            throw new InvalidQRTokenException("QR Token không hợp lệ hoặc đã bị thay đổi");
        }

        String[] parts = decrypted.split("_");
        if (parts.length < 2) {
            throw new InvalidQRTokenException("Định dạng QR Token không hợp lệ");
        }

        Long ticketId;
        Long userId;
        try {
            ticketId = Long.parseLong(parts[0]);
            userId = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            throw new InvalidQRTokenException("QR Token chứa dữ liệu không hợp lệ");
        }

        UserTicket ticket = userTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("UserTicket", "id", ticketId));

        if (!ticket.getUser().getId().equals(userId)) {
            throw new BadRequestException("QR Token không khớp với người sở hữu vé");
        }

        if (ticket.getOrder().getPaymentStatus() != com.ticketbox.enums.PaymentStatus.PAID) {
            throw new BadRequestException("Vé chưa được thanh toán, không thể xác thực.");
        }

        boolean isAdmin = scanner.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            com.ticketbox.entity.User scannerUser = userRepository.findById(scanner.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", scanner.getId()));
            boolean isApprovedOrganizer = scannerUser.getRole() == UserRole.ROLE_ORGANIZER
                    && scannerUser.getAgencyStatus() == AgencyStatus.APPROVED;

            if (!isApprovedOrganizer) {
                throw new BadRequestException("Bạn không có quyền xác thực vé của sự kiện này");
            }
        }

        return ticket;
    }

    private CheckinScanResponse buildScanResponse(
            UserTicket ticket,
            String action,
            LocalDateTime checkinTime,
            LocalDateTime checkoutTime,
            String message) {
        return CheckinScanResponse.builder()
                .action(action)
                .ticketId(ticket.getId())
                .ticketTypeName(ticket.getTicketType() != null ? ticket.getTicketType().getName() : null)
                .eventTitle(ticket.getTicketType() != null && ticket.getTicketType().getEvent() != null
                        ? ticket.getTicketType().getEvent().getTitle()
                        : null)
                .attendeeName(ticket.getUser() != null ? ticket.getUser().getFullName() : null)
                .checkinTime(checkinTime)
                .checkoutTime(checkoutTime)
                .recordedAt("CHECK_OUT".equals(action) ? checkoutTime : checkinTime)
                .message(message)
                .build();
    }

    private String normalizeQrToken(String rawToken) {
        String token = rawToken.trim();

        for (int i = 0; i < 2; i++) {
            try {
                String decoded = URLDecoder.decode(token, StandardCharsets.UTF_8);
                if (decoded.equals(token)) break;
                token = decoded.trim();
            } catch (Exception e) {
                break;
            }
        }

        if ((token.startsWith("\"") && token.endsWith("\"")) ||
                (token.startsWith("'") && token.endsWith("'"))) {
            token = token.substring(1, token.length() - 1).trim();
        }

        if (token.startsWith("http://") || token.startsWith("https://")) {
            try {
                URI uri = URI.create(token);
                String query = uri.getRawQuery();
                if (query != null) {
                    for (String pair : query.split("&")) {
                        String[] parts = pair.split("=", 2);
                        if (parts.length == 2 && (
                                "qrToken".equalsIgnoreCase(parts[0]) ||
                                "token".equalsIgnoreCase(parts[0]) ||
                                "qr".equalsIgnoreCase(parts[0]))) {
                            return URLDecoder.decode(parts[1], StandardCharsets.UTF_8).trim();
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Cannot parse QR URL, using raw token: {}", e.getMessage());
            }
        }

        return token.replaceAll("\\s+", "");
    }
}
