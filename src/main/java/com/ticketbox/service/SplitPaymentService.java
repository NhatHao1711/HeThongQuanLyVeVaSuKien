package com.ticketbox.service;

import com.ticketbox.dto.response.SplitPaymentDashboardResponse;
import com.ticketbox.dto.response.SubPaymentDetailResponse;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.Order;
import com.ticketbox.entity.SubPayment;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.exception.BadRequestException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.SubPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SplitPaymentService {

    private final OrderRepository orderRepository;
    private final SubPaymentRepository subPaymentRepository;
    private final PaymentService paymentService;
    private final com.ticketbox.repository.UserTicketRepository userTicketRepository;
    private final com.ticketbox.repository.SeatRepository seatRepository;
    private final SeatService seatService;

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${payos.client-id}")
    private String clientId;

    @Value("${payos.api-key}")
    private String apiKey;

    @Value("${payos.checksum-key}")
    private String checksumKey;

    @Transactional
    public SplitPaymentDashboardResponse createSplitPayment(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền thao tác trên đơn hàng này.");
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("Đơn hàng đã được thanh toán.");
        }

        if (order.isSplitPayment() && !order.getSubPayments().isEmpty()) {
            return getDashboardInfo(orderId, userId);
        }

        int ticketCount = order.getUserTickets().size();
        if (ticketCount <= 1) {
            throw new BadRequestException("Chỉ có thể chia sẻ thanh toán cho đơn hàng có từ 2 vé trở lên.");
        }

        List<SubPayment> subPayments = new ArrayList<>();
        order.setSplitPayment(true);
        orderRepository.save(order);

        com.ticketbox.entity.TicketType ticketType = order.getUserTickets().get(0).getTicketType();
        List<com.ticketbox.entity.Seat> allSeats = seatRepository.findByTicketTypeId(ticketType.getId());
        Map<Long, BigDecimal> seatPrices = seatService.calculateZeroSumPrices(allSeats, ticketType.getPrice());

        BigDecimal discountPerTicket = BigDecimal.ZERO;
        if (order.getDiscountAmount() != null && order.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            discountPerTicket = order.getDiscountAmount().divide(BigDecimal.valueOf(ticketCount), RoundingMode.HALF_UP);
        }

        for (com.ticketbox.entity.UserTicket ticket : order.getUserTickets()) {
            BigDecimal seatPrice = ticket.getTicketType().getPrice();
            if (ticket.getSeat() != null) {
                seatPrice = seatPrices.getOrDefault(ticket.getSeat().getId(), ticket.getTicketType().getPrice());
            }
            
            BigDecimal finalAmount = seatPrice.subtract(discountPerTicket);
            if (finalAmount.compareTo(BigDecimal.ZERO) < 0) {
                finalAmount = BigDecimal.ZERO;
            }

            SubPayment subPayment = SubPayment.builder()
                    .order(order)
                    .amount(finalAmount)
                    .paymentLinkCode(UUID.randomUUID().toString())
                    .status(PaymentStatus.PENDING)
                    .build();
            subPayment = subPaymentRepository.save(subPayment);
            
            ticket.setSubPayment(subPayment);
            subPayments.add(subPayment);
        }
        
        userTicketRepository.saveAll(order.getUserTickets());

        return getDashboardInfo(orderId, userId);
    }

    @Transactional
    public SplitPaymentDashboardResponse getDashboardInfo(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền xem thông tin này.");
        }

        Event event = order.getEvent();
        String eventName = event != null ? event.getTitle() : "Sự kiện";

        List<SubPayment> subPayments = subPaymentRepository.findByOrderId(orderId);
        
        // Cập nhật trạng thái PayOS thủ công nếu đang PENDING (vì webhook không hoạt động ở localhost)
        for (SubPayment sp : subPayments) {
            if (sp.getStatus() == PaymentStatus.PENDING && sp.getTransactionRef() != null) {
                try {
                    org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                    org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                    headers.set("x-client-id", clientId);
                    headers.set("x-api-key", apiKey);
                    org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
                    org.springframework.http.ResponseEntity<Map> apiRes = restTemplate.exchange(
                            "https://api-merchant.payos.vn/v2/payment-requests/" + sp.getTransactionRef(),
                            org.springframework.http.HttpMethod.GET,
                            entity,
                            Map.class
                    );
                    Map resBody = apiRes.getBody();
                    if (resBody != null && "00".equals(resBody.get("code"))) {
                        Map<String, Object> payosData = (Map<String, Object>) resBody.get("data");
                        if ("PAID".equals(payosData.get("status"))) {
                            paymentService.processWebhookLogic(Long.parseLong(sp.getTransactionRef()), sp.getAmount().intValue());
                            sp.setStatus(PaymentStatus.PAID);
                            subPaymentRepository.save(sp);
                        }
                    }
                } catch (Exception e) {
                    log.error("Lỗi kiểm tra trạng thái PayOS cho subPayment " + sp.getId(), e);
                }
            }
        }
        
        // Tải lại subPayments sau khi có thể đã cập nhật
        subPayments = subPaymentRepository.findByOrderId(orderId);
        
        int paidLinks = (int) subPayments.stream().filter(s -> s.getStatus() == PaymentStatus.PAID).count();

        List<SplitPaymentDashboardResponse.SubPaymentLinkInfo> linkInfos = subPayments.stream()
                .map(s -> {
                    String ticketTypeName = "Vé";
                    String seatName = "";
                    com.ticketbox.entity.UserTicket ticket = order.getUserTickets().stream()
                            .filter(t -> t.getSubPayment() != null && t.getSubPayment().getId().equals(s.getId()))
                            .findFirst()
                            .orElse(null);
                    if (ticket != null) {
                        ticketTypeName = ticket.getTicketType() != null ? ticket.getTicketType().getName() : "Vé";
                        if (ticket.getSeat() != null) {
                            seatName = ticket.getSeat().getName();
                            
                            // Appending VIP / Normal / Economy based on price comparison
                            com.ticketbox.entity.TicketType ticketTypeObj = ticket.getTicketType();
                            if (ticketTypeObj != null) {
                                List<com.ticketbox.entity.Seat> allSeats = seatRepository.findByTicketTypeId(ticketTypeObj.getId());
                                java.util.Map<Long, java.math.BigDecimal> typePrices = seatService.calculateZeroSumPrices(allSeats, ticketTypeObj.getPrice());
                                java.math.BigDecimal seatPrice = typePrices.getOrDefault(ticket.getSeat().getId(), ticketTypeObj.getPrice());
                                
                                if (seatPrice.compareTo(ticketTypeObj.getPrice()) > 0) {
                                    ticketTypeName += " (VIP)";
                                } else if (seatPrice.compareTo(ticketTypeObj.getPrice()) < 0) {
                                    ticketTypeName += " (Tiết kiệm)";
                                } else {
                                    ticketTypeName += " (Thường)";
                                }
                            }
                        }
                    }
                    return SplitPaymentDashboardResponse.SubPaymentLinkInfo.builder()
                        .paymentLinkCode(s.getPaymentLinkCode())
                        .amount(s.getAmount())
                        .status(s.getStatus().name())
                        .ticketTypeName(ticketTypeName)
                        .seatName(seatName)
                        .build();
                })
                .collect(Collectors.toList());

        return SplitPaymentDashboardResponse.builder()
                .orderId(orderId)
                .eventName(eventName)
                .totalAmount(order.getTotalAmount())
                .totalLinks(subPayments.size())
                .paidLinks(paidLinks)
                .links(linkInfos)
                .build();
    }

    @Transactional
    public SubPaymentDetailResponse getSubPaymentDetail(String paymentLinkCode) {
        SubPayment subPayment = subPaymentRepository.findByPaymentLinkCode(paymentLinkCode)
                .orElseThrow(() -> new ResourceNotFoundException("SubPayment", "code", paymentLinkCode));

        if (subPayment.getStatus() == PaymentStatus.PENDING && subPayment.getTransactionRef() != null) {
            try {
                org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.set("x-client-id", clientId);
                headers.set("x-api-key", apiKey);
                org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
                org.springframework.http.ResponseEntity<Map> apiRes = restTemplate.exchange(
                        "https://api-merchant.payos.vn/v2/payment-requests/" + subPayment.getTransactionRef(),
                        org.springframework.http.HttpMethod.GET,
                        entity,
                        Map.class
                );
                Map resBody = apiRes.getBody();
                if (resBody != null && "00".equals(resBody.get("code"))) {
                    Map<String, Object> payosData = (Map<String, Object>) resBody.get("data");
                    if ("PAID".equals(payosData.get("status"))) {
                        paymentService.processWebhookLogic(Long.parseLong(subPayment.getTransactionRef()), subPayment.getAmount().intValue());
                        subPayment.setStatus(PaymentStatus.PAID);
                        subPayment = subPaymentRepository.save(subPayment);
                    }
                }
            } catch (Exception e) {
                log.error("Lỗi kiểm tra trạng thái PayOS cho subPayment " + subPayment.getId(), e);
            }
        }

        Order order = subPayment.getOrder();
        Event event = order.getEvent();
        String eventName = event != null ? event.getTitle() : "Sự kiện";

        String ticketTypeName = "Vé";
        String seatName = "";
        final Long currentSubPaymentId = subPayment.getId();
        com.ticketbox.entity.UserTicket ticket = order.getUserTickets().stream()
                .filter(t -> t.getSubPayment() != null && t.getSubPayment().getId().equals(currentSubPaymentId))
                .findFirst()
                .orElse(null);
        if (ticket != null) {
            ticketTypeName = ticket.getTicketType() != null ? ticket.getTicketType().getName() : "Vé";
            seatName = ticket.getSeat() != null ? ticket.getSeat().getName() : "";
        }

        return SubPaymentDetailResponse.builder()
                .paymentLinkCode(paymentLinkCode)
                .eventName(eventName)
                .amount(subPayment.getAmount())
                .status(subPayment.getStatus().name())
                .orderStatus(order.getPaymentStatus().name())
                .ticketTypeName(ticketTypeName)
                .seatName(seatName)
                .build();
    }

    @Transactional
    public Map<String, Object> generatePayOsLinkForSubPayment(String paymentLinkCode) throws Exception {
        SubPayment subPayment = subPaymentRepository.findByPaymentLinkCode(paymentLinkCode)
                .orElseThrow(() -> new ResourceNotFoundException("SubPayment", "code", paymentLinkCode));

        if (subPayment.getStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("Phần tiền này đã được thanh toán.");
        }
        
        Order order = subPayment.getOrder();
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("Toàn bộ đơn hàng đã được thanh toán.");
        }

        String transactionRef = String.valueOf(System.currentTimeMillis()) + String.format("%03d", (int)(Math.random() * 1000));
        subPayment.setTransactionRef(transactionRef);
        subPaymentRepository.save(subPayment);

        long orderCode = Long.parseLong(transactionRef);
        int amount = subPayment.getAmount().intValue();
        String description = "TBOX SPLIT " + order.getId();

        if (description.length() > 25) {
            description = description.substring(0, 25);
        }

        String returnUrl = frontendUrl + "/split-payment/pay/" + paymentLinkCode + "?status=success";
        String cancelUrl = frontendUrl + "/split-payment/pay/" + paymentLinkCode + "?status=cancel";

        Map<String, Object> body = new HashMap<>();
        body.put("orderCode", orderCode);
        body.put("amount", amount);
        body.put("description", description);
        body.put("returnUrl", returnUrl);
        body.put("cancelUrl", cancelUrl);

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
            return result;
        } else {
            throw new RuntimeException("Lỗi từ PayOS: " + (resBody != null ? resBody.get("desc") : "Unknown"));
        }
    }
}
