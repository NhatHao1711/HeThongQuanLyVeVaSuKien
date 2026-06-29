package com.ticketbox.controller;

import com.ticketbox.dto.PaymentExceptionLogDTO;
import com.ticketbox.entity.Order;
import com.ticketbox.entity.PaymentExceptionLog;
import com.ticketbox.entity.User;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.PaymentExceptionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminPaymentExceptionController {

    private final PaymentExceptionLogRepository exceptionLogRepository;
    private final OrderRepository orderRepository;
    private final com.ticketbox.repository.TicketTypeRepository ticketTypeRepository;
    private final com.ticketbox.repository.SeatRepository seatRepository;
    private final com.ticketbox.repository.UserTicketRepository userTicketRepository;

    @GetMapping("/payment-exceptions")
    public ResponseEntity<?> getExceptionLogs() {
        List<PaymentExceptionLog> logs = exceptionLogRepository.findAllByOrderByCreatedAtDesc();
        List<PaymentExceptionLogDTO> dtos = logs.stream().map(log -> {
            String name = "N/A";
            String email = "N/A";
            String phone = "N/A";
            List<Order> orders = orderRepository.findByTransactionRef(log.getTransactionRef());
            if (!orders.isEmpty() && orders.get(0).getUser() != null) {
                User user = orders.get(0).getUser();
                name = user.getFullName();
                email = user.getEmail();
                phone = user.getPhone();
            }
            return new PaymentExceptionLogDTO(log, name, email, phone);
        }).collect(Collectors.toList());
        return ResponseEntity.ok(java.util.Map.of("success", true, "data", dtos));
    }

    @PutMapping("/payment-exceptions/{id}/resolve")
    public ResponseEntity<?> resolveException(@PathVariable Long id) {
        PaymentExceptionLog log = exceptionLogRepository.findById(id).orElse(null);
        if (log == null) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Không tìm thấy ngoại lệ"));
        }
        log.setStatus("RESOLVED");
        exceptionLogRepository.save(log);

        // Update order status to REFUNDED so the warning banner disappears for the user
        List<Order> orders = orderRepository.findByTransactionRef(log.getTransactionRef());
        for (Order order : orders) {
            if (com.ticketbox.enums.PaymentStatus.PARTIAL_PAID.equals(order.getPaymentStatus())) {
                order.setPaymentStatus(com.ticketbox.enums.PaymentStatus.REFUNDED);
                
                // Release tickets and seats
                for (com.ticketbox.entity.UserTicket ticket : order.getUserTickets()) {
                    com.ticketbox.entity.TicketType ticketType = ticket.getTicketType();
                    ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() + 1);
                    ticketTypeRepository.save(ticketType);

                    com.ticketbox.entity.Seat seat = ticket.getSeat();
                    if (seat != null) {
                        seat.setStatus(com.ticketbox.enums.SeatStatus.AVAILABLE);
                        seatRepository.save(seat);
                        ticket.setSeat(null); // Gỡ liên kết ghế (chống Duplicate entry)
                        userTicketRepository.save(ticket);
                    }
                }
                
                orderRepository.save(order);
            }
        }

        return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Đã đánh dấu xử lý thành công"));
    }
}
