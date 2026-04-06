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
        return userTicketRepository.findByUserId(userId)
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
        if (ticket.getQrToken() != null) {
            qrCode = qrCodeService.generateQRCode(ticket.getQrToken());
        }

        return TicketResponse.builder()
                .id(ticket.getId())
                .orderRef(ticket.getOrder().getTransactionRef())
                .eventTitle(ticket.getTicketType().getEvent().getTitle())
                .ticketTypeName(ticket.getTicketType().getName())
                .checkinStatus(ticket.getCheckinStatus().toString())
                .checkinTime(ticket.getCheckinTime())
                .qrCode(qrCode)
                .qrToken(ticket.getQrToken())
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
