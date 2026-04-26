package com.ticketbox.service;

import com.ticketbox.entity.Order;
import com.ticketbox.entity.Seat;
import com.ticketbox.entity.TicketType;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.enums.SeatStatus;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.SeatRepository;
import com.ticketbox.repository.TicketTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderCleanupService {

    private final OrderRepository orderRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final SeatRepository seatRepository;

    @Scheduled(cron = "0 * * * * *") // Chạy mỗi phút
    @Transactional
    public void cleanupPendingOrders() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(15);
        List<Order> pendingOrders = orderRepository.findByPaymentStatusAndCreatedAtBefore(PaymentStatus.PENDING, cutoffTime);

        if (pendingOrders.isEmpty()) {
            return;
        }

        log.info("🗑️ Found {} PENDING orders older than 15 minutes. Cancelling...", pendingOrders.size());

        for (Order order : pendingOrders) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            
            // Hoàn trả vé và ghế
            for (UserTicket ticket : order.getUserTickets()) {
                // Hoàn vé
                TicketType ticketType = ticket.getTicketType();
                ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() + 1);
                ticketTypeRepository.save(ticketType);

                // Hoàn ghế (nếu có)
                Seat seat = ticket.getSeat();
                if (seat != null) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seatRepository.save(seat);
                }
            }
        }
        
        orderRepository.saveAll(pendingOrders);
        log.info("✅ Cancelled {} orders and restored tickets/seats.", pendingOrders.size());
    }
}
