package com.ticketbox.service;

import com.ticketbox.dto.PaymentCompletedMessage;
import com.ticketbox.dto.response.PaymentUrlResponse;
import com.ticketbox.entity.Order;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.exception.PaymentVerificationException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * VNPayService - Nhiệm vụ B: Thanh toán VNPay
 *
 * 1. Tạo URL thanh toán với HMAC SHA512
 * 2. Xử lý callback/return với Idempotency check
 * 3. Publish message tới RabbitMQ sau thanh toán thành công
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VNPayService {

    private final OrderRepository orderRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${vnpay.tmn-code}")
    private String vnpTmnCode;

    @Value("${vnpay.hash-secret}")
    private String vnpHashSecret;

    @Value("${vnpay.pay-url}")
    private String vnpPayUrl;

    @Value("${vnpay.return-url}")
    private String vnpReturnUrl;

    @Value("${rabbitmq.exchange.ticket}")
    private String ticketExchange;

    @Value("${rabbitmq.routing-key.payment-completed}")
    private String paymentCompletedRoutingKey;

    /**
     * Tạo URL thanh toán VNPay (HMAC SHA512)
     */
    public PaymentUrlResponse createPaymentUrl(Long orderId, String ipAddress) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // VNPay amount = amount * 100 (đơn vị: VNĐ, không có phần thập phân)
        long amount = order.getTotalAmount().longValue() * 100;
        String txnRef = order.getTransactionRef();

        Map<String, String> vnpParams = new TreeMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnpTmnCode);
        vnpParams.put("vnp_Amount", String.valueOf(amount));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", txnRef);
        vnpParams.put("vnp_OrderInfo", "Thanh toan ve su kien - " + txnRef);
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpReturnUrl);
        vnpParams.put("vnp_IpAddr", ipAddress);

        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String createDate = formatter.format(cal.getTime());
        vnpParams.put("vnp_CreateDate", createDate);

        cal.add(Calendar.MINUTE, 15);
        String expireDate = formatter.format(cal.getTime());
        vnpParams.put("vnp_ExpireDate", expireDate);

        // Build query string & hash
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<Map.Entry<String, String>> itr = vnpParams.entrySet().iterator();

        while (itr.hasNext()) {
            Map.Entry<String, String> entry = itr.next();
            String fieldName = entry.getKey();
            String fieldValue = entry.getValue();

            // Build hash data
            hashData.append(fieldName).append('=')
                    .append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));

            // Build query
            query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII))
                    .append('=')
                    .append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));

            if (itr.hasNext()) {
                hashData.append('&');
                query.append('&');
            }
        }

        String vnpSecureHash = hmacSHA512(vnpHashSecret, hashData.toString());
        String paymentUrl = vnpPayUrl + "?" + query + "&vnp_SecureHash=" + vnpSecureHash;

        log.info("💳 Created VNPay URL for Order #{}, txnRef={}", orderId, txnRef);

        return PaymentUrlResponse.builder()
                .paymentUrl(paymentUrl)
                .transactionRef(txnRef)
                .build();
    }

    /**
     * Xử lý VNPay Return/Webhook - Có Idempotency
     */
    @Transactional
    public boolean processPaymentReturn(Map<String, String> params) {
        // 1. Extract và verify hash
        String vnpSecureHash = params.get("vnp_SecureHash");
        Map<String, String> sortedParams = new TreeMap<>(params);
        sortedParams.remove("vnp_SecureHash");
        sortedParams.remove("vnp_SecureHashType");

        StringBuilder hashData = new StringBuilder();
        Iterator<Map.Entry<String, String>> itr = sortedParams.entrySet().iterator();
        while (itr.hasNext()) {
            Map.Entry<String, String> entry = itr.next();
            hashData.append(entry.getKey()).append('=')
                    .append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII));
            if (itr.hasNext()) {
                hashData.append('&');
            }
        }

        String calculatedHash = hmacSHA512(vnpHashSecret, hashData.toString());

        if (!calculatedHash.equalsIgnoreCase(vnpSecureHash)) {
            log.error("❌ HMAC verification failed!");
            throw new PaymentVerificationException("Chữ ký số không hợp lệ");
        }

        // 2. Extract transaction info
        String txnRef = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");

        // 3. Find order by transaction reference
        Order order = orderRepository.findByTransactionRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Order", "transactionRef", txnRef));

        // 4. IDEMPOTENCY CHECK: Nếu order đã PAID rồi → return true, không xử lý lại
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            log.info("⚡ Idempotency: Order #{} already PAID, skipping...", order.getId());
            return true;
        }

        // 5. Kiểm tra response code
        if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
            // Thanh toán thành công
            order.setPaymentStatus(PaymentStatus.PAID);
            orderRepository.save(order);

            log.info("✅ Payment SUCCESS for Order #{}, txnRef={}", order.getId(), txnRef);

            // 6. Publish message to RabbitMQ
            PaymentCompletedMessage message = PaymentCompletedMessage.builder()
                    .orderId(order.getId())
                    .userId(order.getUser().getId())
                    .transactionRef(txnRef)
                    .build();

            rabbitTemplate.convertAndSend(ticketExchange,
                    paymentCompletedRoutingKey, message);

            log.info("📨 Published payment completed message to RabbitMQ for Order #{}",
                    order.getId());

            return true;
        } else {
            // Thanh toán thất bại
            order.setPaymentStatus(PaymentStatus.FAILED);
            orderRepository.save(order);
            log.warn("❌ Payment FAILED for Order #{}, responseCode={}", order.getId(),
                    responseCode);
            return false;
        }
    }

    /**
     * HMAC SHA512 signing
     */
    private String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(
                    key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] hash = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder sb = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC SHA512", e);
        }
    }
}
