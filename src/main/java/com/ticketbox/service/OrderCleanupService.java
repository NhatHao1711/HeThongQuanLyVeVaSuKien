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
    private final com.ticketbox.repository.UserTicketRepository userTicketRepository;
    private final com.ticketbox.repository.PaymentExceptionLogRepository paymentExceptionLogRepository;
    private final com.ticketbox.service.EmailService emailService;
    private final org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;

    @org.springframework.beans.factory.annotation.Value("${rabbitmq.exchange.ticket}")
    private String ticketExchange;

    @org.springframework.beans.factory.annotation.Value("${rabbitmq.routing-key.payment-completed}")
    private String paymentCompletedRoutingKey;

    @Scheduled(cron = "0 * * * * *") // Chạy mỗi phút
    @Transactional
    public void cleanupPendingOrders() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(10);
        List<Order> pendingOrders = orderRepository.findByPaymentStatusAndCreatedAtBefore(PaymentStatus.PENDING, cutoffTime);

        if (pendingOrders.isEmpty()) {
            return;
        }

        log.info("🗑️ Found {} PENDING orders older than 10 minutes. Cancelling...", pendingOrders.size());

        for (Order order : pendingOrders) {
            boolean isPartialPaid = false;
            java.util.List<UserTicket> ticketsToCancel = new java.util.ArrayList<>();
            java.util.List<UserTicket> ticketsToKeep = new java.util.ArrayList<>();

            if (order.isSplitPayment() && order.getSubPayments() != null) {
                long paidCount = order.getSubPayments().stream().filter(sp -> sp.getStatus() == PaymentStatus.PAID).count();
                if (paidCount > 0) {
                    isPartialPaid = true;
                    log.info("🪄 Đơn hàng {} (Chia bill) quá hạn, tự động tách đơn. Giữ lại {} vé đã thanh toán.", order.getId(), paidCount);
                    
                    java.math.BigDecimal newTotalAmount = java.math.BigDecimal.ZERO;
                    for (UserTicket ticket : order.getUserTickets()) {
                        if (ticket.getSubPayment() != null && ticket.getSubPayment().getStatus() == PaymentStatus.PAID) {
                            ticketsToKeep.add(ticket);
                            newTotalAmount = newTotalAmount.add(ticket.getSubPayment().getAmount());
                        } else {
                            ticketsToCancel.add(ticket);
                        }
                    }
                    
                    order.setTotalAmount(newTotalAmount);
                    order.setPaymentStatus(PaymentStatus.PAID);
                    order.getUserTickets().clear();
                    order.getUserTickets().addAll(ticketsToKeep);
                    orderRepository.save(order);
                    
                    // Trigger cấp vé và gửi email
                    if (order.getUser() != null) {
                        try {
                            com.ticketbox.dto.PaymentCompletedMessage message = com.ticketbox.dto.PaymentCompletedMessage.builder()
                                .orderId(order.getId())
                                .userId(order.getUser().getId())
                                .transactionRef(order.getTransactionRef())
                                .build();
                            rabbitTemplate.convertAndSend(ticketExchange, paymentCompletedRoutingKey, message);
                        } catch (Exception e) {
                            log.error("Lỗi khi gửi email vé tách đơn {}", order.getId(), e);
                        }
                    }
                } else {
                    ticketsToCancel.addAll(order.getUserTickets());
                    order.setPaymentStatus(PaymentStatus.FAILED);
                }
            } else {
                ticketsToCancel.addAll(order.getUserTickets());
                order.setPaymentStatus(PaymentStatus.FAILED);
            }
            
            // Hoàn trả vé và ghế cho các vé bị hủy
            for (UserTicket ticket : ticketsToCancel) {
                // Hoàn vé
                TicketType ticketType = ticket.getTicketType();
                ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() + 1);
                ticketTypeRepository.save(ticketType);

                // Hoàn ghế (nếu có)
                Seat seat = ticket.getSeat();
                if (seat != null) {
                    ticket.setOriginalSeatId(seat.getId()); // Lưu lại lịch sử để hồi sinh
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seatRepository.save(seat);
                    ticket.setSeat(null); // Gỡ liên kết ghế
                }
                
                if (isPartialPaid) {
                    // Nếu là tách đơn, xóa cứng ticket bị hủy khỏi DB để khỏi dính líu order gốc
                    userTicketRepository.delete(ticket);
                } else {
                    userTicketRepository.save(ticket);
                }
            }
            
            if (!isPartialPaid) {
                orderRepository.save(order);
            }
        }
        
        orderRepository.saveAll(pendingOrders);
        log.info("✅ Cancelled {} orders and restored tickets/seats.", pendingOrders.size());
    }
}
