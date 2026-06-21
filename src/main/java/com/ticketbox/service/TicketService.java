package com.ticketbox.service;

import com.ticketbox.dto.response.TicketResponse;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.repository.UserTicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * TicketService - Helper service cho tickets management
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final UserTicketRepository userTicketRepository;
    private final QRCodeService qrCodeService;

    /**
     * Lấy danh sách vé của user
     */
    public List<TicketResponse> getUserTickets(Long userId) {
        return userTicketRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết vé theo ID
     */
    public TicketResponse getTicketById(Long ticketId) {
        UserTicket ticket = userTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        return toResponse(ticket);
    }

    private TicketResponse toResponse(UserTicket ticket) {
        byte[] qrCode = null;
        String qrToken = null;

        // Chỉ hiển thị QR code nếu đã thanh toán
        if (ticket.getOrder().getPaymentStatus() == com.ticketbox.enums.PaymentStatus.PAID) {
            qrToken = ticket.getQrToken();
            if (qrToken != null) {
                qrCode = qrCodeService.generateQRCode(qrToken);
            }
        }

        return TicketResponse.builder()
                .id(ticket.getId())
                .orderRef(ticket.getOrder().getTransactionRef())
                .eventTitle(ticket.getTicketType().getEvent().getTitle())
                .ticketTypeName(ticket.getTicketType().getName())
                .checkinStatus(ticket.getCheckinStatus().toString())
                .checkinTime(ticket.getCheckinTime())
                .qrCode(qrCode)
                .qrToken(qrToken)
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
