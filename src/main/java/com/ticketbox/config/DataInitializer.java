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
                jdbcTemplate.execute("ALTER TABLE events MODIFY COLUMN status VARCHAR(50) NOT NULL");
                log.info("🔧 Đã fix column status trong bảng events thành VARCHAR(50)");
            } catch (Exception ex) {
                log.warn("⚠️ Không thể fix column status: {}", ex.getMessage());
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
}
