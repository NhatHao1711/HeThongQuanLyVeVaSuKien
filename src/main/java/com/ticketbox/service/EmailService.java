package com.ticketbox.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.ticketbox.entity.Event;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.MessagingException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * EmailService - Gửi email xác nhận đặt vé kèm mã QR
 */
@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private QRCodeService qrCodeService;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @PostConstruct
    public void init() {
        if (mailSender == null) {
            log.warn("⚠️ JavaMailSender is NULL - email sending will be DISABLED. Check spring.mail config.");
        } else {
            log.info("✅ EmailService initialized. From: {}", fromEmail);
        }
    }

    @Async
    public void sendBookingConfirmation(String toEmail, String fullName,
                                         String eventTitle, String ticketTypeName,
                                         int quantity, BigDecimal totalAmount,
                                         String transactionRef, String qrToken) {
        if (mailSender == null) {
            log.warn("📧 Mail sender not configured. Skipping email to {}", toEmail);
            return;
        }

        if (fromEmail == null || fromEmail.isBlank()) {
            log.error("❌ From email is not configured (spring.mail.username). Skipping email.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🎫 TRIVENT - Xác nhận đặt vé: " + eventTitle);

            NumberFormat vndFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
            String formattedAmount = vndFormat.format(totalAmount);

            // Generate ticket code from transactionRef for display
            String ticketCode = transactionRef;

            String htmlContent = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
                  <div style="background: linear-gradient(135deg, #1a1a2e 0%%, #16213e 100%%); padding: 30px; text-align: center;">
                    <h1 style="color: #00B46E; margin: 0; font-size: 28px;">🎪 TRIVENT</h1>
                    <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Hệ thống quản lý sự kiện & bán vé</p>
                  </div>
                  
                  <div style="background: #fff; padding: 30px; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #1a1a2e; margin: 0 0 8px;">Xin chào %s! 👋</h2>
                    <p style="color: #6b7280; line-height: 1.6;">Bạn đã đặt vé thành công. Dưới đây là thông tin chi tiết:</p>
                    
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <table style="width: 100%%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Sự kiện:</td>
                          <td style="padding: 8px 0; color: #1a1a2e; font-weight: 700; text-align: right;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Loại vé:</td>
                          <td style="padding: 8px 0; color: #1a1a2e; font-weight: 700; text-align: right;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Số lượng:</td>
                          <td style="padding: 8px 0; color: #1a1a2e; font-weight: 700; text-align: right;">%d vé</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Tổng tiền:</td>
                          <td style="padding: 8px 0; color: #00B46E; font-weight: 800; font-size: 18px; text-align: right;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280;">Mã đơn hàng:</td>
                          <td style="padding: 8px 0; color: #1a1a2e; font-weight: 700; font-family: monospace; text-align: right;">%s</td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- QR Code Section -->
                    <div style="text-align: center; margin: 24px 0; padding: 24px; background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0;">
                      <p style="color: #4a5568; font-weight: 700; font-size: 16px; margin: 0 0 4px;">🎟 Mã vé điện tử</p>
                      <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px;">Đưa mã QR này cho ban tổ chức để check-in</p>
                      <img src="cid:qrcode" alt="QR Code vé" style="width: 200px; height: 200px; border-radius: 8px; border: 1px solid #e2e8f0;" />
                      <p style="color: #1a1a2e; font-family: monospace; font-weight: 800; font-size: 18px; letter-spacing: 2px; margin: 12px 0 0;">%s</p>
                    </div>
                    
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0;">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        ⚠️ <strong>Lưu ý:</strong> Vui lòng chuyển khoản theo thông tin đã hiển thị trên trang đặt vé. 
                        Sau khi thanh toán, bạn có thể xem mã QR vé tại mục <strong>"Vé của tôi"</strong> trên website.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 24px 0;">
                      <a href="http://localhost:3000/my-tickets" 
                         style="display: inline-block; background: #00B46E; color: #fff; padding: 14px 32px; 
                                border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
                        Xem vé của tôi →
                      </a>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                      © 2026 TRIVENT by Hào · Sang · Đức. All rights reserved.
                    </p>
                  </div>
                </div>
                """.formatted(fullName, eventTitle, ticketTypeName, quantity, formattedAmount, transactionRef, ticketCode);

            helper.setText(htmlContent, true);

            // Generate QR code image and attach as inline CID
            if (qrToken != null && !qrToken.isEmpty()) {
                byte[] qrBytes = qrCodeService.generateQRCode(qrToken, 200, 200);
                helper.addInline("qrcode", new ByteArrayResource(qrBytes), "image/png");
            }

            mailSender.send(message);
            log.info("📧 Email with QR sent to {} for event: {}", toEmail, eventTitle);

        } catch (Exception e) {
            log.error("❌ Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendEventReminder(String toEmail, String fullName,
                                   String eventTitle, java.time.LocalDateTime eventTime,
                                   String location) {
        if (mailSender == null) {
            log.warn("📧 Mail sender not configured. Skipping reminder to {}", toEmail);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🔔 TRIVENT - Nhắc nhở: " + eventTitle + " sắp diễn ra!");

            String formattedTime = eventTime.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));

            String htmlContent = """
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 32px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">🔔 Sự kiện sắp diễn ra!</h1>
                    <p style="margin: 8px 0 0; opacity: 0.9;">Đừng quên tham gia nhé!</p>
                  </div>
                  <div style="padding: 32px;">
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Sự kiện <strong style="color: #00B46E;">%s</strong> sẽ diễn ra trong <strong>24 giờ nữa</strong>!</p>
                    <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #00B46E;">
                      <p style="margin: 0 0 8px;"><strong>📅 Thời gian:</strong> %s</p>
                      <p style="margin: 0;"><strong>📍 Địa điểm:</strong> %s</p>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Hãy chuẩn bị sẵn sàng và đến đúng giờ. Chúc bạn có trải nghiệm tuyệt vời! 🎉</p>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                      © 2026 TRIVENT. Hệ thống quản lý sự kiện cho sinh viên.
                    </p>
                  </div>
                </div>
                """.formatted(fullName, eventTitle, formattedTime, location != null ? location : "Xem chi tiết trên web");

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("🔔 Reminder email sent to {} for event: {}", toEmail, eventTitle);

        } catch (Exception e) {
            log.error("❌ Failed to send reminder to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String fullName, String resetToken) {
        if (mailSender == null) {
            log.warn("📧 Mail sender not configured. Skipping password reset to {}", toEmail);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🔑 TRIVENT - Đặt lại mật khẩu");

            String resetLink = "http://localhost:3000/reset-password?token=" + resetToken;

            String htmlContent = """
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #1a1a2e 0%%, #16213e 100%%); padding: 32px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">🔑 Đặt lại mật khẩu</h1>
                  </div>
                  <div style="padding: 32px;">
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản TRIVENT.</p>
                    <div style="text-align: center; margin: 24px 0;">
                      <a href="%s" style="display: inline-block; background: #00B46E; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 16px;">
                        Đặt lại mật khẩu
                      </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Link này sẽ hết hạn sau <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                      © 2026 TRIVENT. Hệ thống quản lý sự kiện cho sinh viên.
                    </p>
                  </div>
                </div>
                """.formatted(fullName, resetLink);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("🔑 Password reset email sent to {}", toEmail);

        } catch (Exception e) {
            log.error("❌ Failed to send password reset to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendMarketingEmail(String toEmail, Event event) {
        if (toEmail == null || toEmail.isEmpty() || event == null) return;
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(toEmail);
            helper.setSubject("🔥 SỰ KIỆN HOT TỪ TRIVENT: " + event.getTitle());
            
            String eventUrl = "http://localhost:3000/events/" + event.getId();
            String imageUrl = event.getImageUrl() != null && !event.getImageUrl().isEmpty() ? 
                (event.getImageUrl().startsWith("http") ? event.getImageUrl() : "http://localhost:8080/uploads/" + event.getImageUrl()) : 
                "https://via.placeholder.com/600x300?text=TRIVENT+HOT+EVENT";

            String htmlContent = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                    <img src="%s" alt="Event Cover" style="width: 100%%; height: auto; display: block;" />
                    <div style="padding: 32px 24px;">
                        <h2 style="color: #00B46E; margin-top: 0; font-size: 24px;">Sự Kiện Nổi Bật Dành Cho Bạn!</h2>
                        <h3 style="color: #1a1a2e; font-size: 20px; line-height: 1.4;">%s</h3>
                        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 24px 0;">
                            <p style="margin: 0 0 8px 0; color: #4a5568;"><strong>📍 Địa điểm:</strong> %s</p>
                            <p style="margin: 0; color: #4a5568;"><strong>⏰ Thời gian:</strong> %s</p>
                        </div>
                        <div style="text-align: center; margin-top: 32px;">
                            <a href="%s" style="display: inline-block; padding: 14px 32px; background-color: #00B46E; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                Xem Chi Tiết & Đặt Vé Ngay
                            </a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin: 0;">
                            Email này được gửi từ hệ thống TRIVENT.
                        </p>
                    </div>
                </div>
            """.formatted(
                imageUrl, 
                event.getTitle(), 
                event.getLocation(), 
                event.getStartTime() != null ? event.getStartTime().toString().replace("T", " ") : "Sắp tới",
                eventUrl
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("📧 Marketing email sent to {}", toEmail);
        } catch (MessagingException e) {
            log.error("❌ Failed to send marketing email to {}: {}", toEmail, e.getMessage());
        }
    }
}
