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
    private final PaymentService paymentService;

    /**
     * Lấy danh sách vé của user
     */
    public List<TicketResponse> getUserTickets(Long userId) {
        List<UserTicket> tickets = userTicketRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        // Auto-sync pending orders before mapping
        tickets.stream()
               .map(UserTicket::getOrder)
               .distinct()
               .filter(order -> order.getPaymentStatus() == com.ticketbox.enums.PaymentStatus.PENDING 
                             && order.getPaymentMethod() == com.ticketbox.enums.PaymentMethod.BANK_TRANSFER)
               .forEach(order -> {
                   try {
                       paymentService.checkAndUpdateOrderStatus(order);
                   } catch (Exception e) {}
               });

        return tickets.stream()
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
                .eventId(ticket.getTicketType().getEvent().getId())
                .eventTitle(ticket.getTicketType().getEvent().getTitle())
                .startDate(ticket.getTicketType().getEvent().getStartTime())
                .ticketTypeName(ticket.getTicketType().getName())
                .seatName(ticket.getSeat() != null ? ticket.getSeat().getName() : "Không có (Khu vực chung)")
                .price(ticket.getTicketType().getPrice())
                .checkinStatus(ticket.getCheckinStatus().toString())
                .checkinTime(ticket.getCheckinTime())
                .qrCode(qrCode)
                .qrToken(qrToken)
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
