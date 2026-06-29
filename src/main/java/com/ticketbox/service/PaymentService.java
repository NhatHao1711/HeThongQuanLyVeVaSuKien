package com.ticketbox.service;

import com.ticketbox.entity.Order;
import com.ticketbox.entity.User;
import com.ticketbox.enums.PaymentMethod;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.repository.SeatRepository;
import com.ticketbox.dto.PaymentCompletedMessage;
import com.ticketbox.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.type.CheckoutResponseData;
import vn.payos.type.PaymentData;
import vn.payos.type.Webhook;
import vn.payos.type.WebhookData;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PayOS payOS;
    private final OrderRepository orderRepository;
    private final SeatRepository seatRepository;
    private final RabbitTemplate rabbitTemplate;
    private final UserRepository userRepository;
    private final com.ticketbox.repository.LedgerEntryRepository ledgerEntryRepository;
    private final com.ticketbox.repository.PaymentExceptionLogRepository paymentExceptionLogRepository;
    private final EmailService emailService;
    private final com.ticketbox.repository.TicketTypeRepository ticketTypeRepository;
    private final com.ticketbox.repository.UserTicketRepository userTicketRepository;

    @Value("${rabbitmq.exchange.ticket}")
    private String ticketExchange;

    @Value("${rabbitmq.routing-key.payment-completed}")
    private String paymentCompletedRoutingKey;

    public String createPaymentLink() throws Exception {
        try {
            long orderCode = System.currentTimeMillis() / 1000;
            int amount = 100000;
            String description = "Thanh toan ve SK";
            String returnUrl = "http://localhost:8080/test-pay.html";
            String cancelUrl = "http://localhost:8080/test-pay.html";

            PaymentData paymentData = PaymentData.builder()
                    .orderCode(orderCode)
                    .amount(amount)
                    .description(description)
                    .returnUrl(returnUrl)
                    .cancelUrl(cancelUrl)
                    .build();

            System.out.println("Đang gửi yêu cầu lên PayOS với orderCode: " + orderCode);

            CheckoutResponseData response = payOS.createPaymentLink(paymentData);

            System.out.println("Tạo link thành công: " + response.getCheckoutUrl());
            return response.getCheckoutUrl();

        } catch (Exception e) {
            // Ép hệ thống phải in màu đỏ ra Terminal nếu có lỗi
            System.err.println("=== LỖI TẠO ĐƠN HÀNG PAYOS ===");
            e.printStackTrace();
            throw e;
        }
    }

    @Value("${payos.client-id}")
    private String clientId;

    @Value("${payos.api-key}")
    private String apiKey;

    @Value("${payos.checksum-key}")
    private String checksumKey;

    @Transactional
    public Map<String, Object> createPayOSPaymentLink(java.util.List<Long> orderIds, String userEmail) throws Exception {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        java.util.List<Order> orders = orderRepository.findAllById(orderIds);
        if (orders.isEmpty()) {
            throw new ResourceNotFoundException("Orders", "ids", orderIds.toString());
        }

        int amount = 0;
        String firstOrderId = String.valueOf(orders.get(0).getId());

        for (Order order : orders) {
            if (!order.getUser().getId().equals(user.getId())) {
                throw new com.ticketbox.exception.BadRequestException("Bạn không có quyền thanh toán cho đơn hàng này.");
            }
            amount += order.getTotalAmount().intValue();
        }

        String newTransactionRef = String.valueOf(System.currentTimeMillis()) + String.format("%03d", (int)(Math.random() * 1000));
        
        for (Order order : orders) {
            order.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
            order.setTransactionRef(newTransactionRef);
        }
        orderRepository.saveAll(orders);

        long orderCode = Long.parseLong(newTransactionRef);
        String description = "TRIVENT " + firstOrderId;


        if (description.length() > 25) {
            description = description.substring(0, 25);
        }

        String returnUrl = "http://localhost:3000/payment-redirect?status=success";
        String cancelUrl = "http://localhost:3000/payment-redirect?status=cancel";

        // Create request manually to bypass buggy PayOS SDK 1.0.3 response verification
        Map<String, Object> body = new HashMap<>();
        body.put("orderCode", orderCode);
        body.put("amount", amount);
        body.put("description", description);
        body.put("returnUrl", returnUrl);
        body.put("cancelUrl", cancelUrl);

        // Generate signature
        String sortedData = String.format("amount=%s&cancelUrl=%s&description=%s&orderCode=%s&returnUrl=%s",
                amount, cancelUrl, description, orderCode, returnUrl);
        
        javax.crypto.Mac sha256_HMAC = javax.crypto.Mac.getInstance("HmacSHA256");
        javax.crypto.spec.SecretKeySpec secret_key = new javax.crypto.spec.SecretKeySpec(checksumKey.getBytes("UTF-8"), "HmacSHA256");
        sha256_HMAC.init(secret_key);
        byte[] hash = sha256_HMAC.doFinal(sortedData.getBytes("UTF-8"));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if(hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        body.put("signature", hexString.toString());

        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("x-client-id", clientId);
        headers.set("x-api-key", apiKey);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        org.springframework.http.HttpEntity<Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(body, headers);
        
        org.springframework.http.ResponseEntity<Map> apiRes = restTemplate.postForEntity("https://api-merchant.payos.vn/v2/payment-requests", entity, Map.class);
        
        Map resBody = apiRes.getBody();
        if (resBody != null && "00".equals(resBody.get("code"))) {
            Map<String, Object> data = (Map<String, Object>) resBody.get("data");
            Map<String, Object> result = new HashMap<>();
            result.put("checkoutUrl", data.get("checkoutUrl"));
            result.put("accountNumber", data.get("accountNumber"));
            result.put("accountName", data.get("accountName"));
            result.put("amount", data.get("amount"));
            result.put("description", data.get("description"));
            result.put("bin", data.get("bin"));
            result.put("qrCode", data.get("qrCode"));
            result.put("paymentLinkId", data.get("paymentLinkId"));
            return result;
        } else {
            throw new RuntimeException("Lỗi từ PayOS: " + (resBody != null ? resBody.get("desc") : "Unknown"));
        }
    }

    @Transactional
    public PaymentStatus checkAndUpdateOrderStatus(Order order) {
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            return PaymentStatus.PAID;
        }

        long orderCode;
        if (order.getTransactionRef() != null && order.getTransactionRef().matches("\\d+")) {
            orderCode = Long.parseLong(order.getTransactionRef());
        } else {
            orderCode = order.getId();
        }

        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("x-client-id", clientId);
            headers.set("x-api-key", apiKey);

            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<Map> apiRes = restTemplate.exchange(
                    "https://api-merchant.payos.vn/v2/payment-requests/" + orderCode,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    Map.class
            );

            Map resBody = apiRes.getBody();
            if (resBody != null && "00".equals(resBody.get("code"))) {
                Map<String, Object> data = (Map<String, Object>) resBody.get("data");
                if ("PAID".equals(data.get("status"))) {
                    java.util.List<Order> orders = orderRepository.findByTransactionRef(order.getTransactionRef());
                    if (orders.isEmpty()) {
                        orders = java.util.List.of(order);
                    }

                    for (Order o : orders) {
                        o.setPaymentStatus(PaymentStatus.PAID);
                        o.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
                        orderRepository.save(o);

                        for (com.ticketbox.entity.UserTicket ticket : o.getUserTickets()) {
                            com.ticketbox.entity.Seat seat = ticket.getSeat();
                            if (seat != null) {
                                seat.setStatus(com.ticketbox.enums.SeatStatus.BOOKED);
                                seatRepository.save(seat);
                            }
                        }

                        PaymentCompletedMessage message = PaymentCompletedMessage.builder()
                                .orderId(o.getId())
                                .userId(o.getUser().getId())
                                .transactionRef(o.getTransactionRef())
                                .build();

                        rabbitTemplate.convertAndSend(ticketExchange, paymentCompletedRoutingKey, message);
                        log.info("✅ Đã đồng bộ trạng thái PAID từ PayOS cho đơn hàng #{}", o.getId());
                    }
                    return PaymentStatus.PAID;
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra trạng thái PayOS cho đơn hàng " + order.getId(), e);
        }

        return order.getPaymentStatus();
    }

    @Transactional
    public void processPayOSWebhook(Webhook body) throws Exception {
        log.info("📥 Nhận webhook từ PayOS");
        
        // 1. Xác thực chữ ký webhook từ PayOS
        WebhookData webhookData = payOS.verifyPaymentWebhookData(body);
        if (webhookData == null) {
            throw new IllegalArgumentException("Xác thực chữ ký PayOS thất bại");
        }

        long orderCode = webhookData.getOrderCode();
        int amountPaid = webhookData.getAmount();

        processWebhookLogic(orderCode, amountPaid);
    }

    @Transactional
    public void processWebhookLogic(long orderCode, int amountPaid) {

        // 2. Tìm kiếm đơn hàng
        java.util.List<Order> orders = orderRepository.findByTransactionRef(String.valueOf(orderCode));
        if (orders.isEmpty()) {
            Order singleOrder = orderRepository.findById(orderCode).orElse(null);
            if (singleOrder != null) {
                orders = java.util.List.of(singleOrder);
            }
        }
                
        if (orders.isEmpty()) {
            throw new ResourceNotFoundException("Orders", "transactionRef/id", orderCode);
        }

        // 3. Đối chiếu kép (Amount matching check) tổng các đơn
        int expectedAmount = orders.stream().mapToInt(o -> o.getTotalAmount().intValue()).sum();
        if (amountPaid != expectedAmount) {
            log.error("❌ Số tiền thanh toán không khớp! Thực tế: {}, Kì vọng: {}", amountPaid, expectedAmount);
            
            // Log ngoại lệ vào Database
            com.ticketbox.entity.PaymentExceptionLog exceptionLog = com.ticketbox.entity.PaymentExceptionLog.builder()
                    .transactionRef(String.valueOf(orderCode))
                    .expectedAmount(java.math.BigDecimal.valueOf(expectedAmount))
                    .actualAmount(java.math.BigDecimal.valueOf(amountPaid))
                    .reason("Khách hàng chuyển khoản sai số tiền")
                    .status("UNRESOLVED")
                    .build();
            paymentExceptionLogRepository.save(exceptionLog);
            
            // Send email to the customer
            if (!orders.isEmpty() && orders.get(0).getUser() != null) {
                User user = orders.get(0).getUser();
                emailService.sendPaymentExceptionEmail(
                    user.getEmail(), 
                    user.getFullName(), 
                    String.valueOf(orderCode), 
                    java.math.BigDecimal.valueOf(expectedAmount), 
                    java.math.BigDecimal.valueOf(amountPaid),
                    "Khách hàng chuyển khoản sai số tiền"
                );
            }
            
            // Cập nhật trạng thái PARTIAL_PAID
            for (Order order : orders) {
                order.setPaymentStatus(PaymentStatus.PARTIAL_PAID);
                orderRepository.save(order);
            }
            
            // Thay vì throw Exception (sẽ làm Spring Rollback lại toàn bộ Database)
            // Ta return luôn để Transaction được Commit thành công
            log.warn("Đã lưu log ngoại lệ và đánh dấu PARTIAL_PAID. Ngừng xử lý đơn hàng.");
            return;
        }

        for (Order order : orders) {
            // Lũy đẳng (Double Payment check)
            if (order.getPaymentStatus() == PaymentStatus.PAID) {
                log.warn("⚡ Double Payment: Giao dịch đơn hàng {} đã ở trạng thái PAID. Khách chuyển tiền 2 lần.", order.getId());
                com.ticketbox.entity.PaymentExceptionLog exceptionLog = com.ticketbox.entity.PaymentExceptionLog.builder()
                        .transactionRef(String.valueOf(orderCode))
                        .expectedAmount(java.math.BigDecimal.valueOf(expectedAmount))
                        .actualAmount(java.math.BigDecimal.valueOf(amountPaid))
                        .reason("Thanh toán trùng lặp (Double Payment) cho đơn hàng đã hoàn tất")
                        .status("UNRESOLVED")
                        .build();
                paymentExceptionLogRepository.save(exceptionLog);
                
                if (order.getUser() != null) {
                    User user = order.getUser();
                    emailService.sendPaymentExceptionEmail(
                        user.getEmail(), 
                        user.getFullName(), 
                        String.valueOf(orderCode), 
                        java.math.BigDecimal.valueOf(expectedAmount), 
                        java.math.BigDecimal.valueOf(amountPaid),
                        "Thanh toán trùng lặp (Double Payment) cho đơn hàng đã hoàn tất"
                    );
                }
                
                continue;
            }

            // Quá hạn (Late Payment check)
            if (order.getPaymentStatus() == PaymentStatus.FAILED) {
                log.warn("⏳ Late Payment: Giao dịch đơn hàng {} đã bị Hủy/Quá hạn nhưng khách vẫn chuyển tiền. Kiểm tra khả năng hồi sinh...", order.getId());
                boolean canResurrect = true;
                
                // Kiểm tra xem tất cả các ghế/vé có còn trống không
                for (com.ticketbox.entity.UserTicket ticket : order.getUserTickets()) {
                    if (ticket.getOriginalSeatId() != null) {
                        com.ticketbox.entity.Seat originalSeat = seatRepository.findById(ticket.getOriginalSeatId()).orElse(null);
                        if (originalSeat == null || originalSeat.getStatus() != com.ticketbox.enums.SeatStatus.AVAILABLE) {
                            canResurrect = false;
                            break;
                        }
                    } else {
                        com.ticketbox.entity.TicketType ticketType = ticket.getTicketType();
                        if (ticketType.getAvailableQuantity() <= 0) {
                            canResurrect = false;
                            break;
                        }
                    }
                }

                if (canResurrect) {
                    log.info("🌟 Resurrecting Order {}: Ghế/Vé vẫn còn trống. Tự động hồi sinh đơn hàng!", order.getId());
                    for (com.ticketbox.entity.UserTicket ticket : order.getUserTickets()) {
                        if (ticket.getOriginalSeatId() != null) {
                            com.ticketbox.entity.Seat originalSeat = seatRepository.findById(ticket.getOriginalSeatId()).get();
                            originalSeat.setStatus(com.ticketbox.enums.SeatStatus.BOOKED);
                            seatRepository.save(originalSeat);
                            ticket.setSeat(originalSeat);
                        } else {
                            com.ticketbox.entity.TicketType ticketType = ticket.getTicketType();
                            ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() - 1);
                            ticketTypeRepository.save(ticketType);
                        }
                        userTicketRepository.save(ticket);
                    }
                    // Bỏ qua tạo Exception, để vòng lặp tiếp tục cập nhật trạng thái PAID bên dưới
                } else {
                    log.warn("❌ Không thể hồi sinh đơn hàng {}: Ghế hoặc vé đã bị mua mất.", order.getId());
                    com.ticketbox.entity.PaymentExceptionLog exceptionLog = com.ticketbox.entity.PaymentExceptionLog.builder()
                            .transactionRef(String.valueOf(orderCode))
                            .expectedAmount(java.math.BigDecimal.valueOf(expectedAmount))
                            .actualAmount(java.math.BigDecimal.valueOf(amountPaid))
                            .reason("Thanh toán quá hạn - Ghế đã bị người khác mua")
                            .status("UNRESOLVED")
                            .build();
                    paymentExceptionLogRepository.save(exceptionLog);
                    
                    if (order.getUser() != null) {
                        User user = order.getUser();
                        emailService.sendPaymentExceptionEmail(
                            user.getEmail(), 
                            user.getFullName(), 
                            String.valueOf(orderCode), 
                            java.math.BigDecimal.valueOf(expectedAmount), 
                            java.math.BigDecimal.valueOf(amountPaid),
                            "Thanh toán quá hạn - Ghế đã bị người khác mua"
                        );
                    }
                    continue; // Bỏ qua đơn hàng này
                }
            }

            // 5. Cập nhật trạng thái đơn hàng và chia sẻ doanh thu 80%
            order.setPaymentStatus(PaymentStatus.PAID);
            order.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
            orderRepository.save(order);

            // Chia tiền hoa hồng nếu có organizer
            com.ticketbox.entity.Event event = order.getEvent();
            if (event != null && event.getOrganizer() != null) {
                com.ticketbox.entity.User organizer = event.getOrganizer();
                java.math.BigDecimal total = order.getTotalAmount();
                if (total != null && total.compareTo(java.math.BigDecimal.ZERO) > 0) {
                    java.math.BigDecimal organizerShare = total.multiply(organizer.getCommissionRate() != null ? java.math.BigDecimal.ONE.subtract(organizer.getCommissionRate()) : new java.math.BigDecimal("0.80"));
                    
                    // Cập nhật holdingBalance
                    java.math.BigDecimal currentBalance = organizer.getHoldingBalance() != null ? organizer.getHoldingBalance() : java.math.BigDecimal.ZERO;
                    organizer.setHoldingBalance(currentBalance.add(organizerShare));
                    userRepository.save(organizer);
                    
                    // Tạo Ledger Entry
                    com.ticketbox.entity.LedgerEntry ledgerEntry = com.ticketbox.entity.LedgerEntry.builder()
                            .order(order)
                            .agency(organizer)
                            .entryType("CREDIT_TICKET_SALE")
                            .amount(organizerShare)
                            .status("HOLDING")
                            .build();
                    ledgerEntryRepository.save(ledgerEntry);
                    
                    log.info("💰 Đã cộng {} VND vào tài khoản TẠM GIỮ đại lý: {}", organizerShare, organizer.getEmail());
                }
            }

            // 6. Cập nhật các ghế liên quan sang BOOKED
            for (com.ticketbox.entity.UserTicket ticket : order.getUserTickets()) {
                com.ticketbox.entity.Seat seat = ticket.getSeat();
                if (seat != null) {
                    seat.setStatus(com.ticketbox.enums.SeatStatus.BOOKED);
                    seatRepository.save(seat);
                }
            }

            log.info("✅ Cập nhật thanh toán thành công cho đơn hàng #{}", order.getId());

            // 7. Gửi message đến RabbitMQ để hoàn tất vé
            PaymentCompletedMessage message = PaymentCompletedMessage.builder()
                    .orderId(order.getId())
                    .userId(order.getUser().getId())
                    .transactionRef(order.getTransactionRef())
                    .build();

            rabbitTemplate.convertAndSend(ticketExchange, paymentCompletedRoutingKey, message);
            log.info("📨 Đã gửi message hoàn tất thanh toán đến RabbitMQ cho đơn hàng #{}", order.getId());
        }
    }
}