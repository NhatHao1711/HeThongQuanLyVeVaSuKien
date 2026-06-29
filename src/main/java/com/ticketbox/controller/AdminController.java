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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

import com.ticketbox.dto.response.EventResponse;
import com.ticketbox.entity.Seat;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.enums.AgencyStatus;
import com.ticketbox.enums.EventStatus;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.enums.SeatStatus;
import com.ticketbox.service.EventService;
import com.ticketbox.service.SeatService;

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
    private final SeatService seatService;
    private final SeatRepository seatRepository;
    private final EventService eventService;

    // ========== Dashboard Stats ==========
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        List<com.ticketbox.entity.Event> activeEvents = eventRepository.findAll().stream()
                .filter(event -> event.getStatus() != EventStatus.CANCELLED)
                .collect(Collectors.toList());

        long totalUsers = userRepository.count();
        long totalEvents = activeEvents.size();
        long totalOrders = orderRepository.count();
        long totalTicketsSold = userTicketRepository.findAll().stream()
                .filter(ut -> ut.getOrder().getPaymentStatus() == PaymentStatus.PAID)
                .filter(ut -> ut.getTicketType() != null
                        && ut.getTicketType().getEvent() != null
                        && ut.getTicketType().getEvent().getStatus() != EventStatus.CANCELLED)
                .count();

        BigDecimal totalRevenue = orderRepository.findAll().stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID)
                .map(o -> o.getTotalAmount())
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingEvents = activeEvents.stream()
                .filter(e -> e.getStatus() == EventStatus.PENDING)
                .count();

        long publishedEvents = activeEvents.stream()
                .filter(e -> e.getStatus() == EventStatus.PUBLISHED)
                .count();

        long activeOrganizers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ROLE_ORGANIZER && u.getAgencyStatus() == AgencyStatus.APPROVED)
                .count();

        long pendingOrganizers = userRepository.findAll().stream()
                .filter(u -> u.getAgencyStatus() == AgencyStatus.PENDING)
                .count();

        // Thống kê doanh số theo ngày
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, List<Order>> ordersByDate = orderRepository.findAll().stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID)
                .collect(Collectors.groupingBy(o -> o.getCreatedAt().format(formatter), TreeMap::new,
                        Collectors.toList()));

        List<Map<String, Object>> salesByDate = new ArrayList<>();
        ordersByDate.forEach((dateStr, dayOrders) -> {
            Map<String, Object> dayStats = new HashMap<>();
            dayStats.put("date", dateStr);
            dayStats.put("ordersCount", dayOrders.size());
            long tickets = dayOrders.stream().mapToLong(o -> o.getUserTickets().size()).sum();
            dayStats.put("ticketsSold", tickets);
            BigDecimal dayRevenue = dayOrders.stream()
                    .map(o -> o.getTotalAmount())
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            dayStats.put("revenue", dayRevenue);
            salesByDate.add(dayStats);
        });

        // Phân loại theo danh mục sự kiện
        Map<String, Long> categoryStats = activeEvents.stream()
                .filter(e -> e.getCategory() != null)
                .collect(Collectors.groupingBy(e -> e.getCategory().getName(), Collectors.counting()));

        // Phân phối số vé bán theo danh mục
        Map<String, Long> categoryTicketSales = userTicketRepository.findAll().stream()
                .filter(ut -> ut.getOrder() != null && ut.getOrder().getPaymentStatus() == PaymentStatus.PAID
                        && ut.getTicketType() != null && ut.getTicketType().getEvent() != null
                        && ut.getTicketType().getEvent().getStatus() != EventStatus.CANCELLED
                        && ut.getTicketType().getEvent().getCategory() != null)
                .collect(Collectors.groupingBy(ut -> ut.getTicketType().getEvent().getCategory().getName(),
                        Collectors.counting()));

        stats.put("totalUsers", totalUsers);
        stats.put("totalEvents", totalEvents);
        stats.put("totalOrders", totalOrders);
        stats.put("totalTicketsSold", totalTicketsSold);
        stats.put("totalRevenue", totalRevenue);
        stats.put("pendingEvents", pendingEvents);
        stats.put("publishedEvents", publishedEvents);
        stats.put("activeOrganizers", activeOrganizers);
        stats.put("pendingOrganizers", pendingOrganizers);
        stats.put("salesByDate", salesByDate);
        stats.put("categoryStats", categoryStats);
        stats.put("categoryTicketSales", categoryTicketSales);

        return ResponseEntity.ok(ApiResponse.success("Thống kê dashboard", stats));
    }

    // ========== Revenue Stats ==========
    @GetMapping("/stats/revenue")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRevenueStats() {
        Map<String, Object> result = new HashMap<>();

        // Revenue by event
        List<Map<String, Object>> eventStats = eventRepository.findAll().stream()
                .filter(event -> event.getStatus() != EventStatus.CANCELLED)
                .map(event -> {
            Map<String, Object> es = new HashMap<>();
            es.put("eventId", event.getId());
            es.put("title", event.getTitle());
            var orders = orderRepository.findAll().stream()
                    .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID)
                    .filter(o -> o.getUserTickets().stream()
                            .anyMatch(ut -> ut.getTicketType().getEvent().getId().equals(event.getId())))
                    .collect(Collectors.toList());
            BigDecimal revenue = orders.stream()
                    .map(o -> o.getTotalAmount())
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
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID)
                .map(o -> o.getTotalAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tính tổng phí sàn (20%) thu về từ các đơn hàng của Đại lý (có organizer)
        BigDecimal platformFee = orderRepository.findAll().stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID)
                .filter(o -> o.getEvent() != null && o.getEvent().getOrganizer() != null)
                .map(o -> {
                    BigDecimal rate = o.getEvent().getOrganizer().getCommissionRate();
                    if (rate == null)
                        rate = new BigDecimal("0.20");
                    return o.getTotalAmount().multiply(rate);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tổng nợ chưa thanh toán cho đại lý = sum(balance + holdingBalance) của tất cả
        // ROLE_ORGANIZER
        BigDecimal totalOrganizerDebt = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ROLE_ORGANIZER)
                .map(u -> (u.getBalance() != null ? u.getBalance() : BigDecimal.ZERO)
                        .add(u.getHoldingBalance() != null ? u.getHoldingBalance() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        result.put("totalRevenue", totalRevenue);
        result.put("platformFee", platformFee);
        result.put("totalOrganizerDebt", totalOrganizerDebt);
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
                    map.put("balance", user.getBalance());
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
        if (body.containsKey("fullName"))
            user.setFullName(body.get("fullName"));
        if (body.containsKey("email"))
            user.setEmail(body.get("email"));
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

    @PutMapping("/users/{id}/payout")
    public ResponseEntity<ApiResponse<String>> payoutAgency(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() != UserRole.ROLE_ORGANIZER) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User is not an organizer"));
        }
        user.setBalance(BigDecimal.ZERO);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Đã thanh toán toàn bộ số dư cho đại lý", "OK"));
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
                .filter(event -> event.getStatus() != com.ticketbox.enums.EventStatus.CANCELLED)
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
                    map.put("imageUrl", event.getImageUrl());
                    // Include ticket types
                    List<Map<String, Object>> tts = event.getTicketTypes().stream().map(tt -> {
                        Map<String, Object> ttMap = new HashMap<>();
                        ttMap.put("id", tt.getId());
                        ttMap.put("name", tt.getName());
                        ttMap.put("price", tt.getPrice());
                        ttMap.put("totalQuantity", tt.getTotalQuantity());
                        ttMap.put("availableQuantity", tt.getAvailableQuantity());
                        ttMap.put("eventDate", tt.getEventDate());
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
        if (body.containsKey("name"))
            tt.setName((String) body.get("name"));
        if (body.containsKey("price"))
            tt.setPrice(BigDecimal.valueOf(((Number) body.get("price")).doubleValue()));
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

    // ========== Seat Management ==========

    /** Lấy số ghế hiện có của một ticket type */
    @GetMapping("/ticket-types/{id}/seats/count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSeatCount(@PathVariable Long id) {
        TicketType tt = ticketTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("TicketType not found"));
        long count = seatRepository.countByTicketTypeId(id);
        Map<String, Object> result = new HashMap<>();
        result.put("ticketTypeId", id);
        result.put("ticketTypeName", tt.getName());
        result.put("seatCount", count);
        return ResponseEntity.ok(ApiResponse.success("Số ghế hiện có", result));
    }

    /**
     * Tạo sơ đồ ghế cho một ticket type.
     * Nếu ghế đã tồn tại → xóa toàn bộ và tạo lại (reset).
     * Body: { "rows": 10, "cols": 10, "prefix": "A" }
     */
    @PostMapping("/ticket-types/{id}/seats/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateSeats(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        TicketType tt = ticketTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("TicketType not found"));

        int rows = body.containsKey("rows") ? ((Number) body.get("rows")).intValue() : 10;
        int cols = body.containsKey("cols") ? ((Number) body.get("cols")).intValue() : 10;
        int total = rows * cols;

        // Xóa ghế cũ nếu có
        long existing = seatRepository.countByTicketTypeId(id);
        if (existing > 0) {
            seatRepository.deleteAll(seatRepository.findByTicketTypeId(id));
        }

        // Tạo ghế mới theo sơ đồ rows x cols
        List<Seat> seats = new ArrayList<>();
        for (int r = 0; r < rows; r++) {
            String rowLabel = String.valueOf((char) ('A' + r));
            for (int c = 1; c <= cols; c++) {
                seats.add(Seat.builder()
                        .ticketType(tt)
                        .name(rowLabel + String.format("%02d", c))
                        .status(SeatStatus.AVAILABLE)
                        .build());
            }
        }
        seatRepository.saveAll(seats);

        Map<String, Object> result = new HashMap<>();
        result.put("ticketTypeId", id);
        result.put("ticketTypeName", tt.getName());
        result.put("seatsCreated", total);
        result.put("rows", rows);
        result.put("cols", cols);
        log.info("Admin tạo {} ghế ({} hàng × {} cột) cho TicketType [{}] \"{}\"",
                total, rows, cols, id, tt.getName());
        return ResponseEntity.ok(ApiResponse.success(
                "Tạo sơ đồ ghế thành công! " + total + " ghế (" + rows + " hàng × " + cols + " cột)", result));
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
                    map.put("paymentMethod", order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "VNPAY");
                    String paymentStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "PENDING";
                    map.put("status", paymentStatus);
                    map.put("paymentStatus", paymentStatus);
                    map.put("createdAt", order.getCreatedAt());
                    map.put("voucherCode", order.getVoucherCode());
                    map.put("discountAmount", order.getDiscountAmount());
                    if (order.getUser() != null) {
                        map.put("userName", order.getUser().getFullName());
                        map.put("userEmail", order.getUser().getEmail());
                        map.put("userPhone", order.getUser().getPhone());
                    }

                    // Lấy chi tiết vé trong đơn hàng
                    List<Map<String, Object>> tickets = order.getUserTickets().stream().map(t -> {
                        Map<String, Object> tMap = new HashMap<>();
                        tMap.put("id", t.getId());
                        tMap.put("qrToken", t.getQrToken());
                        tMap.put("checkinStatus",
                                t.getCheckinStatus() != null ? t.getCheckinStatus().name() : "UNUSED");
                        tMap.put("checkinTime", t.getCheckinTime());
                        if (t.getTicketType() != null) {
                            tMap.put("ticketTypeName", t.getTicketType().getName());
                            tMap.put("ticketPrice", t.getTicketType().getPrice());
                            if (t.getTicketType().getEvent() != null) {
                                tMap.put("eventTitle", t.getTicketType().getEvent().getTitle());
                                tMap.put("eventLocation", t.getTicketType().getEvent().getLocation());
                                tMap.put("eventStartTime", t.getTicketType().getEvent().getStartTime());
                            }
                        }
                        if (t.getSeat() != null) {
                            tMap.put("seatName", t.getSeat().getName());
                        }
                        return tMap;
                    }).collect(Collectors.toList());

                    map.put("tickets", tickets);
                    return map;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Danh sách đơn hàng", orders));
    }

    // ========== Payment Confirmation ==========
    @PutMapping("/orders/{id}/confirm")
    public ResponseEntity<ApiResponse<String>> confirmPayment(@PathVariable Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(PaymentStatus.PAID);
        orderRepository.save(order);

        // Ensure all seats associated with the order are marked as BOOKED
        for (UserTicket ticket : order.getUserTickets()) {
            Seat seat = ticket.getSeat();
            if (seat != null) {
                seat.setStatus(SeatStatus.BOOKED);
                seatRepository.save(seat);
            }
        }

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
                        firstTicket.getQrToken());
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
        order.setPaymentStatus(PaymentStatus.FAILED);
        orderRepository.save(order);

        // Hoàn trả vé và ghế khi từ chối thanh toán
        for (UserTicket ticket : order.getUserTickets()) {
            // Hoàn vé
            TicketType ticketType = ticket.getTicketType();
            ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() + 1);
            ticketTypeRepository.save(ticketType);

            // Hoàn ghế
            Seat seat = ticket.getSeat();
            if (seat != null) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seatRepository.save(seat);
                ticket.setSeat(null); // Gỡ liên kết ghế để ghế khác có thể sử dụng (chống Duplicate entry)
                userTicketRepository.save(ticket);
            }
        }

        return ResponseEntity.ok(ApiResponse.success("Từ chối thanh toán và hoàn trả vé/ghế thành công", "OK"));
    }

    @PostMapping("/events/{id}/approve")
    public ResponseEntity<ApiResponse<EventResponse>> approveEvent(@PathVariable Long id) {
        EventResponse response = eventService.publishEvent(id);
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt sự kiện thành công và đã đăng tải", response));
    }

    @PostMapping("/events/{id}/reject")
    public ResponseEntity<ApiResponse<EventResponse>> rejectEvent(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.get("rejectReason");
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Lý do từ chối duyệt sự kiện không được để trống");
        }
        EventResponse response = eventService.rejectEvent(id, reason);
        return ResponseEntity.ok(ApiResponse.success("Từ chối duyệt sự kiện thành công", response));
    }

    @PostMapping("/events/{id}/featured")
    public ResponseEntity<ApiResponse<EventResponse>> setFeatured(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String tag = body.containsKey("featuredTag") ? (String) body.get("featuredTag") : null;
        Boolean isFeatured = body.containsKey("isFeatured") ? (Boolean) body.get("isFeatured") : null;

        EventResponse response = eventService.updateFeaturedTag(id, tag, isFeatured);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nhãn ưu tiên thành công", response));
    }
}
