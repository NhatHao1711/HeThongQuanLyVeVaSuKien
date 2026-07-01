package com.ticketbox.service;

import com.ticketbox.dto.response.TicketResponse;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.UserTicketRepository;
import com.ticketbox.util.AESUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final AESUtil aesUtil;
    private final com.ticketbox.service.SeatService seatService;
    private final com.ticketbox.repository.SeatRepository seatRepository;

    private final java.util.Map<Long, java.util.Map<Long, java.math.BigDecimal>> seatPricesCache = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Lấy danh sách vé của user
     */
    @Transactional
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
                   } catch (Exception e) {
                       log.warn("Failed to check payos status for order {}", order.getId(), e);
                   }
               });

        return tickets.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy vé theo id
     */
    @Transactional
    public TicketResponse getTicketById(Long ticketId) {
        UserTicket ticket = userTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("UserTicket", "id", ticketId));
        return toResponse(ticket);
    }

    @Transactional
    public TicketResponse getTicketByIdForUser(Long ticketId, Long userId) {
        UserTicket ticket = userTicketRepository.findByIdAndUserId(ticketId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("UserTicket", "id", ticketId));
        return toResponse(ticket);
    }

    @Transactional
    public TicketResponse toResponse(UserTicket ticket) {
        byte[] qrCode = null;
        String qrToken = null;

        boolean isPaid = ticket.getOrder().getPaymentStatus() == com.ticketbox.enums.PaymentStatus.PAID || 
                         (ticket.getSubPayment() != null && ticket.getSubPayment().getStatus() == com.ticketbox.enums.PaymentStatus.PAID);

        // Chỉ hiển thị QR code nếu đã thanh toán
        if (isPaid) {
            if (ticket.getQrToken() == null || ticket.getQrToken().isBlank()) {
                ticket.setQrToken(aesUtil.generateQrTokenContent(ticket.getId(), ticket.getUser().getId()));
                userTicketRepository.save(ticket);
            }
            qrToken = ticket.getQrToken();
            if (qrToken != null) {
                qrCode = qrCodeService.generateQRCode(qrToken);
            }
        }

        java.math.BigDecimal price = ticket.getTicketType().getPrice();
        if (ticket.getSeat() != null) {
            Long typeId = ticket.getTicketType().getId();
            java.util.Map<Long, java.math.BigDecimal> typePrices = seatPricesCache.computeIfAbsent(typeId, id -> {
                List<com.ticketbox.entity.Seat> allSeats = seatRepository.findByTicketTypeId(id);
                return seatService.calculateZeroSumPrices(allSeats, ticket.getTicketType().getPrice());
            });
            price = typePrices.getOrDefault(ticket.getSeat().getId(), price);
        }

        return TicketResponse.builder()
                .id(ticket.getId())
                .orderRef(ticket.getOrder().getTransactionRef())
                .eventId(ticket.getTicketType().getEvent().getId())
                .eventTitle(ticket.getTicketType().getEvent().getTitle())
                .startDate(ticket.getTicketType().getEvent().getStartTime())
                .ticketTypeName(ticket.getTicketType().getName())
                .seatName(ticket.getSeat() != null ? ticket.getSeat().getName() : "Không có (Khu vực chung)")
                .price(price)
                .checkinStatus(ticket.getCheckinStatus().toString())
                .checkinTime(ticket.getCheckinTime())
                .qrCode(qrCode)
                .qrToken(qrToken)
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
