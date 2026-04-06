package com.ticketbox.service;

import com.ticketbox.dto.PaymentCompletedMessage;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.repository.UserTicketRepository;
import com.ticketbox.util.AESUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * TicketFulfillmentService - RabbitMQ Consumer
 *
 * Lắng nghe queue "ticket.payment.completed"
 * Sau khi nhận message:
 * 1. Load tất cả UserTickets của Order
 * 2. Sinh qr_token cho mỗi ticket (AES encrypt)
 * 3. Sinh QR code image (optional: save to S3)
 * 4. Cập nhật UserTicket.qr_token
 * 5. (Optional: gửi email chứa QR code cho user)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TicketFulfillmentService {

    private final UserTicketRepository userTicketRepository;
    private final AESUtil aesUtil;
    private final QRCodeService qrCodeService;

    @RabbitListener(queues = "${rabbitmq.queue.payment-completed}")
    @Transactional
    public void handlePaymentCompleted(PaymentCompletedMessage message) {
        log.info("📥 Received payment completed message: orderId={}, userId={}",
                message.getOrderId(), message.getUserId());

        try {
            // 1. Load all user tickets for this order
            List<UserTicket> tickets = userTicketRepository.findByOrderId(message.getOrderId());

            if (tickets.isEmpty()) {
                log.warn("⚠️ No tickets found for Order #{}", message.getOrderId());
                return;
            }

            // 2. Generate QR token for each ticket
            for (UserTicket ticket : tickets) {
                // Format: "{ticketId}_{userId}_{timestamp}" → AES encrypt
                String qrToken = aesUtil.generateQrTokenContent(
                        ticket.getId(), ticket.getUser().getId());

                ticket.setQrToken(qrToken);

                // 3. Generate QR code image (có thể lưu vào S3/filesystem)
                byte[] qrImage = qrCodeService.generateQRCode(qrToken);

                log.info("🎫 Generated QR for ticket #{}, size={}bytes",
                        ticket.getId(), qrImage.length);

                // TODO: Save QR image to S3 or filesystem
                // TODO: Send email with QR code attachment to user
            }

            // 4. Save all updated tickets
            userTicketRepository.saveAll(tickets);

            log.info("✅ Fulfilled {} tickets for Order #{}",
                    tickets.size(), message.getOrderId());

        } catch (Exception e) {
            log.error("❌ Failed to fulfill tickets for Order #{}",
                    message.getOrderId(), e);
            // In production: implement retry logic or dead letter queue
            throw e;
        }
    }
}
