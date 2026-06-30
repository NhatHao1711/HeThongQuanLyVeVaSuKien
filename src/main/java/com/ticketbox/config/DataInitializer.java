package com.ticketbox.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * Tự động kiểm tra và nạp dữ liệu mẫu khi database trống.
 * 
 * Cơ chế hoạt động:
 * - Mỗi khi Spring Boot khởi động, component này sẽ chạy
 * - Kiểm tra bảng event_categories có dữ liệu không
 * - Nếu TRỐNG → tự động chạy db/data.sql để nạp dữ liệu mẫu
 * - Nếu ĐÃ CÓ dữ liệu → bỏ qua, không làm gì
 * 
 * Lợi ích:
 * - Không bao giờ mất dữ liệu khi restart
 * - Nếu DB bị xóa, dữ liệu tự động được khôi phục
 * - Không cần chạy SQL thủ công
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        try {
            // Lưu ý: KHÔNG tự động duyệt yêu cầu đại lý - Admin phải duyệt thủ công


            // Dọn dẹp các seat_id của vé thuộc đơn hàng FAILED để tránh lỗi Unique Constraint
            try {
                jdbcTemplate.update("UPDATE user_tickets ut " +
                        "JOIN orders o ON ut.order_id = o.id " +
                        "SET ut.seat_id = NULL " +
                        "WHERE o.payment_status = 'FAILED'");
                log.info("🧹 Đã dọn dẹp các seat_id của vé thuộc đơn hàng FAILED.");
            } catch (Exception ex) {
                log.warn("⚠️ Không thể dọn dẹp seat_id của đơn hàng FAILED: {}", ex.getMessage());
            }

            // An toàn nâng cấp cột role từ ENUM/VARCHAR cũ sang VARCHAR(50) mới và đổi ROLE_AGENCY thành ROLE_ORGANIZER
            try {
                // Thêm cột tạm thời
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role_new VARCHAR(50) NULL");
                
                // Copy dữ liệu cũ sang cột mới, đồng thời map ROLE_AGENCY sang ROLE_ORGANIZER
                jdbcTemplate.execute("UPDATE users SET role_new = " +
                        "CASE " +
                        "  WHEN role = 'ROLE_AGENCY' THEN 'ROLE_ORGANIZER' " +
                        "  WHEN role = '2' THEN 'ROLE_ORGANIZER' " + // Đề phòng trường hợp ENUM trả về index dạng chuỗi
                        "  ELSE role " +
                        "END");
                
                // Drop cột cũ và rename cột mới
                jdbcTemplate.execute("ALTER TABLE users DROP COLUMN role");
                jdbcTemplate.execute("ALTER TABLE users CHANGE COLUMN role_new role VARCHAR(50) NOT NULL");
                log.info("✅ Đã nâng cấp thành công cột role sang VARCHAR(50) và đồng bộ vai trò cũ.");
            } catch (Exception ex) {
                log.warn("⚠️ Lưu ý khi nâng cấp cột role (có thể cột đã được nâng cấp): {}", ex.getMessage());
                try {
                    // Thử cập nhật trực tiếp nếu cột đã là VARCHAR
                    jdbcTemplate.execute("UPDATE users SET role = 'ROLE_ORGANIZER' WHERE role = 'ROLE_AGENCY'");
                    jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL");
                    log.info("✅ Đã sửa đổi trực tiếp cột role thành VARCHAR(50).");
                } catch (Exception e2) {
                    log.warn("⚠️ Không thể chạy sửa đổi trực tiếp role: {}", e2.getMessage());
                }
            }

            // Fix lỗi độ dài status của event (enum)
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_status VARCHAR(20) NULL");
                jdbcTemplate.update("UPDATE users SET agency_status = 'APPROVED' " +
                        "WHERE role = 'ROLE_ORGANIZER' AND agency_status IS NULL");
                log.info("Da dong bo agency_status cho cac dai ly cu da duoc cap role.");
            } catch (Exception ex) {
                log.warn("Khong the dong bo agency_status: {}", ex.getMessage());
            }

            try {
                upsertPayoutTestAccount();
            } catch (Exception ex) {
                log.warn("Khong the tao tai khoan test rut tien: {}", ex.getMessage());
            }

            try {
                jdbcTemplate.execute("ALTER TABLE events MODIFY COLUMN status VARCHAR(50) NOT NULL");
                log.info("🔧 Đã fix column status trong bảng events thành VARCHAR(50)");
            } catch (Exception ex) {
                log.warn("⚠️ Không thể fix column status: {}", ex.getMessage());
            }

            try {
                jdbcTemplate.execute("ALTER TABLE user_tickets ADD COLUMN IF NOT EXISTS checkout_time DATETIME NULL");
                log.info("Da dong bo cot checkout_time cho bang user_tickets.");
            } catch (Exception ex) {
                log.warn("Khong the dong bo cot checkout_time: {}", ex.getMessage());
            }

            // Kiểm tra xem bảng events đã có dữ liệu chưa
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM events", Integer.class);

            if (count != null && count > 0) {
                log.info("✅ Database đã có {} events. Skipping seed data load.", count);
                // Tự động đẩy ngày của các sự kiện đã qua lên tương lai (+3 tháng) để hiển thị trên trang chủ
                try {
                    jdbcTemplate.update("UPDATE events SET " +
                            "start_time = DATE_ADD(start_time, INTERVAL 3 MONTH), " +
                            "end_time = DATE_ADD(end_time, INTERVAL 3 MONTH) " +
                            "WHERE end_time < NOW()");
                    log.info("⏰ Đã tự động cập nhật thời gian của các sự kiện đã qua lên tương lai (+3 tháng).");
                } catch (Exception ex) {
                    log.warn("⚠️ Không thể tự động cập nhật thời gian sự kiện: {}", ex.getMessage());
                }
                return;
            }

            // Database trống → nạp dữ liệu từ data.sql
            log.info("📦 Database trống! Đang nạp dữ liệu mẫu từ db/data.sql...");

            ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
            populator.addScript(new ClassPathResource("db/data.sql"));
            populator.setSeparator(";");
            populator.setCommentPrefixes("--");
            populator.setSqlScriptEncoding("UTF-8");
            populator.execute(dataSource);

            log.info("✅ Nạp dữ liệu mẫu thành công!");
            log.info("   → Admin: admin@ticketbox.vn / admin123");
            log.info("   → 10 Events, 8 Universities, 3 Vouchers");

        } catch (Exception e) {
            log.warn("⚠️ Không thể kiểm tra/nạp dữ liệu ban đầu: {}", e.getMessage());
            log.warn("   Bảng có thể chưa được tạo (lần chạy đầu tiên). Sẽ thử lại lần sau.");
        }
    }

    private void upsertPayoutTestAccount() {
        String passwordHash = "$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O";
        String bankJson = "{\"bankName\":\"Vietcombank\",\"bankAccountNumber\":\"0123456789\",\"bankAccountName\":\"TRIVENT TEST AGENCY\"}";

        jdbcTemplate.update(
                "INSERT INTO users (university_id, full_name, email, password_hash, interests_tags, " +
                        "is_verified, role, balance, holding_balance, bank_account, kyc_status, commission_rate, " +
                        "agency_status, created_at, updated_at) " +
                        "VALUES (1, 'Test Agency Payout', 'agency.payout@test.com', ?, " +
                        "'[\"business\",\"events\"]', true, 'ROLE_ORGANIZER', 500000, 0, ?, 'APPROVED', 0.20, " +
                        "'APPROVED', NOW(), NOW()) " +
                        "ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), " +
                        "is_verified = true, role = 'ROLE_ORGANIZER', balance = 500000, holding_balance = 0, " +
                        "bank_account = VALUES(bank_account), kyc_status = 'APPROVED', commission_rate = 0.20, " +
                        "agency_status = 'APPROVED', updated_at = NOW()",
                passwordHash, bankJson);

        jdbcTemplate.update(
                "INSERT INTO organizer_requests (user_id, organization_name, contact_phone, contact_email, " +
                        "description, status, created_at, updated_at) " +
                        "SELECT u.id, 'TRIVENT Test Agency', '0900000000', u.email, " +
                        "'Tai khoan test tinh nang rut tien', 'APPROVED', NOW(), NOW() " +
                        "FROM users u WHERE u.email = 'agency.payout@test.com' " +
                        "AND NOT EXISTS (SELECT 1 FROM organizer_requests r WHERE r.user_id = u.id AND r.status = 'APPROVED')");

        log.info("Tai khoan test rut tien: agency.payout@test.com / admin123 (balance 500000 VND)");
    }
}
