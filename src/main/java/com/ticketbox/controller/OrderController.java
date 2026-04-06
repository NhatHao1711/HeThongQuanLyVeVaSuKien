package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.Order;
import com.ticketbox.entity.User;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    /**
     * GET /api/orders/my - Lấy danh sách đơn hàng của user
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyOrders(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Order> orders = orderRepository.findByUserOrderByCreatedAtDesc(user);

        List<Map<String, Object>> result = orders.stream().map(order -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("transactionRef", order.getTransactionRef());
            map.put("totalAmount", order.getTotalAmount());
            map.put("paymentStatus", order.getPaymentStatus().name());
            map.put("paymentMethod", order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null);
            map.put("voucherCode", order.getVoucherCode());
            map.put("discountAmount", order.getDiscountAmount());
            map.put("createdAt", order.getCreatedAt());
            map.put("updatedAt", order.getUpdatedAt());

            // Include ticket details
            var tickets = order.getUserTickets().stream().map(t -> {
                Map<String, Object> ticketMap = new HashMap<>();
                ticketMap.put("id", t.getId());
                ticketMap.put("ticketTypeName", t.getTicketType().getName());
                ticketMap.put("eventTitle", t.getTicketType().getEvent().getTitle());
                ticketMap.put("eventId", t.getTicketType().getEvent().getId());
                ticketMap.put("checkinStatus", t.getCheckinStatus().name());
                ticketMap.put("price", t.getTicketType().getPrice());
                return ticketMap;
            }).collect(Collectors.toList());
            map.put("tickets", tickets);
            map.put("ticketCount", tickets.size());

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(
                "Lấy danh sách đơn hàng thành công", result));
    }
}
