package com.ticketbox.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
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
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        try {
            // Kiểm tra xem bảng event_categories đã có dữ liệu chưa
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM event_categories", Integer.class);

            if (count != null && count > 0) {
                log.info("✅ Database đã có {} categories. Skipping seed data load.", count);
                return;
            }

            // Database trống → nạp dữ liệu từ data.sql
            log.info("📦 Database trống! Đang nạp dữ liệu mẫu từ db/data.sql...");

            ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
            populator.addScript(new ClassPathResource("db/data.sql"));
            populator.setSeparator(";");
            populator.setCommentPrefixes("--");
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
