package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.Order;
import com.ticketbox.entity.TicketType;
import com.ticketbox.entity.User;
import com.ticketbox.enums.UserRole;
import com.ticketbox.repository.*;
import com.ticketbox.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final UserTicketRepository userTicketRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // ========== Dashboard Stats ==========
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalEvents", eventRepository.count());
        stats.put("totalOrders", orderRepository.count());
        stats.put("totalTicketsSold", userTicketRepository.count());
        return ResponseEntity.ok(ApiResponse.success("Thống kê dashboard", stats));
    }

    // ========== Revenue Stats ==========
    @GetMapping("/stats/revenue")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRevenueStats() {
        Map<String, Object> result = new HashMap<>();

        // Revenue by event
        List<Map<String, Object>> eventStats = eventRepository.findAll().stream().map(event -> {
            Map<String, Object> es = new HashMap<>();
            es.put("eventId", event.getId());
            es.put("title", event.getTitle());
            var orders = orderRepository.findAll().stream()
                    .filter(o -> o.getUserTickets().stream().anyMatch(ut -> 
                        ut.getTicketType().getEvent().getId().equals(event.getId())))
                    .collect(Collectors.toList());
            BigDecimal revenue = orders.stream()
                    .map(Order::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long ticketsSold = orders.stream()
                    .flatMap(o -> o.getUserTickets().stream())
                    .filter(ut -> ut.getTicketType().getEvent().getId().equals(event.getId()))
                    .count();
            es.put("revenue", revenue);
            es.put("ticketsSold", ticketsSold);
            return es;
        }).collect(Collectors.toList());

        BigDecimal totalRevenue = orderRepository.findAll().stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        result.put("totalRevenue", totalRevenue);
        result.put("eventStats", eventStats);
        result.put("totalOrders", orderRepository.count());
        result.put("totalTicketsSold", userTicketRepository.count());

        return ResponseEntity.ok(ApiResponse.success("Thống kê doanh thu", result));
    }

    // ========== User Management ==========
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(user -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", user.getId());
                    map.put("fullName", user.getFullName());
                    map.put("email", user.getEmail());
                    map.put("role", user.getRole().name());
                    map.put("isVerified", user.getIsVerified());
                    map.put("createdAt", user.getCreatedAt());
                    return map;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Danh sách người dùng", users));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<String>> updateUserRole(
            @PathVariable Long id, @RequestParam String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(UserRole.valueOf(role));
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(
                "Đã cập nhật role cho " + user.getEmail(), role));
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<ApiResponse<Boolean>> toggleUserVerified(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsVerified(!user.getIsVerified());
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(
                user.getIsVerified() ? "Đã xác minh" : "Đã bỏ xác minh", user.getIsVerified()));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (body.containsKey("fullName")) user.setFullName(body.get("fullName"));
        if (body.containsKey("email")) user.setEmail(body.get("email"));
        if (body.containsKey("password") && !body.get("password").isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(body.get("password")));
        }
        userRepository.save(user);
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("fullName", user.getFullName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole().name());
        map.put("isVerified", user.getIsVerified());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thành công", map));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa user", "OK"));
    }

    // ========== Event Management ==========
    @GetMapping("/events")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllEvents() {
        List<Map<String, Object>> events = eventRepository.findAll().stream()
                .map(event -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", event.getId());
                    map.put("title", event.getTitle());
                    map.put("description", event.getDescription());
                    map.put("location", event.getLocation());
                    map.put("startTime", event.getStartTime());
                    map.put("endTime", event.getEndTime());
                    map.put("status", event.getStatus());
                    map.put("createdAt", event.getCreatedAt());
                    // Include ticket types
                    List<Map<String, Object>> tts = event.getTicketTypes().stream().map(tt -> {
                        Map<String, Object> ttMap = new HashMap<>();
                        ttMap.put("id", tt.getId());
                        ttMap.put("name", tt.getName());
                        ttMap.put("price", tt.getPrice());
                        ttMap.put("totalQuantity", tt.getTotalQuantity());
                        ttMap.put("availableQuantity", tt.getAvailableQuantity());
                        return ttMap;
                    }).collect(Collectors.toList());
                    map.put("ticketTypes", tts);
                    return map;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Danh sách sự kiện", events));
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<ApiResponse<String>> deleteEvent(@PathVariable Long id) {
        eventRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa sự kiện", "OK"));
    }

    // ========== Ticket Type Management ==========
    @PutMapping("/ticket-types/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTicketType(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        TicketType tt = ticketTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("TicketType not found"));
        if (body.containsKey("name")) tt.setName((String) body.get("name"));
        if (body.containsKey("price")) tt.setPrice(BigDecimal.valueOf(((Number) body.get("price")).doubleValue()));
        if (body.containsKey("totalQuantity")) {
            int newTotal = ((Number) body.get("totalQuantity")).intValue();
            int diff = newTotal - tt.getTotalQuantity();
            tt.setTotalQuantity(newTotal);
            tt.setAvailableQuantity(tt.getAvailableQuantity() + diff);
        }
        ticketTypeRepository.save(tt);
        Map<String, Object> map = new HashMap<>();
        map.put("id", tt.getId());
        map.put("name", tt.getName());
        map.put("price", tt.getPrice());
        map.put("totalQuantity", tt.getTotalQuantity());
        map.put("availableQuantity", tt.getAvailableQuantity());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật loại vé thành công", map));
    }

    @DeleteMapping("/ticket-types/{id}")
    public ResponseEntity<ApiResponse<String>> deleteTicketType(@PathVariable Long id) {
        ticketTypeRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa loại vé", "OK"));
    }

    // ========== Order Management ==========
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllOrders() {
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .map(order -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", order.getId());
                    map.put("transactionRef", order.getTransactionRef());
                    map.put("totalAmount", order.getTotalAmount());
                    map.put("paymentMethod", order.getPaymentMethod());
                    map.put("status", order.getPaymentStatus());
                    map.put("createdAt", order.getCreatedAt());
                    if (order.getUser() != null) {
                        map.put("userName", order.getUser().getFullName());
                        map.put("userEmail", order.getUser().getEmail());
                    }
                    return map;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Danh sách đơn hàng", orders));
    }

    // ========== Payment Confirmation ==========
    @PutMapping("/orders/{id}/confirm")
    public ResponseEntity<ApiResponse<String>> confirmPayment(@PathVariable Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(com.ticketbox.enums.PaymentStatus.PAID);
        orderRepository.save(order);

        // Send confirmation email with QR code
        try {
            var user = order.getUser();
            var tickets = order.getUserTickets();
            if (user != null && tickets != null && !tickets.isEmpty()) {
                var firstTicket = tickets.get(0);
                var ticketType = firstTicket.getTicketType();
                var event = ticketType.getEvent();

                emailService.sendBookingConfirmation(
                    user.getEmail(),
                    user.getFullName(),
                    event.getTitle(),
                    ticketType.getName(),
                    tickets.size(),
                    order.getTotalAmount(),
                    order.getTransactionRef(),
                    firstTicket.getQrToken()
                );
                log.info("📧 Payment confirmation email sent to {} for order #{}", user.getEmail(), order.getId());
            }
        } catch (Exception e) {
            log.error("❌ Failed to send payment confirmation email for order #{}: {}", order.getId(), e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.success("Xác nhận thanh toán thành công", "OK"));
    }

    @PutMapping("/orders/{id}/reject")
    public ResponseEntity<ApiResponse<String>> rejectPayment(@PathVariable Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(com.ticketbox.enums.PaymentStatus.FAILED);
        orderRepository.save(order);
        return ResponseEntity.ok(ApiResponse.success("Từ chối thanh toán", "OK"));
    }
}
