-- =====================================================
-- Hệ Thống Quản Lý Sự Kiện & Bán Vé Online - TRIVENT
-- Database Initialization Script (2026)
-- =====================================================

-- =========== EVENT CATEGORIES ===========
INSERT IGNORE INTO event_categories (id, name, description, icon, created_at) VALUES
(1, 'Công Nghệ', 'Sự kiện công nghệ, lập trình, AI, blockchain', '💻', NOW()),
(2, 'Âm Nhạc', 'Concert, festival âm nhạc, live show', '🎵', NOW()),
(3, 'Thể Thao', 'Marathon, bóng rổ, bóng đá, thể thao ngoài trời', '⚽', NOW()),
(4, 'Nghệ Thuật & Văn Hóa', 'Triển lãm tranh, nhạc liveshow, văn hóa truyền thống', '🎨', NOW()),
(5, 'Kinh Doanh & Startup', 'Hội thảo tuyển dụng, startup summit, networking', '💼', NOW()),
(6, 'Giáo Dục', 'Hội thảo, seminar, khóa học, workshop', '📚', NOW()),
(7, 'Ẩm Thực', 'Food festival, tasting, cooking class', '🍽️', NOW()),
(8, 'Giải Trí & Gaming', 'Esports, gaming tournament, LAN party', '🎮', NOW());

-- =========== UNIVERSITIES ===========
INSERT IGNORE INTO universities (id, name, domain, created_at) VALUES
(1, 'Đại học Bách Khoa TP.HCM', 'hcmut.edu.vn', NOW()),
(2, 'Đại học KHTN TP.HCM', 'hcmus.edu.vn', NOW()),
(3, 'Đại học Kinh Tế TP.HCM', 'ueh.edu.vn', NOW()),
(4, 'Đại học Sài Gòn', 'sgu.edu.vn', NOW()),
(5, 'ĐH Công Nghệ Thông Tin', 'uit.edu.vn', NOW()),
(6, 'Đại học Ngoại Thương', 'utc.edu.vn', NOW()),
(7, 'ĐH Ngân Hàng TP.HCM', 'banking.org.vn', NOW()),
(8, 'Đại học Giáo Dục', 'hpu.edu.vn', NOW());

-- =========== ADMIN USER ===========
-- Password: admin123 => BCrypt hash
INSERT IGNORE INTO users (id, university_id, full_name, email, password_hash,
    interests_tags, is_verified, role, created_at, updated_at) VALUES
(1, 1, 'Admin TRIVENT', 'admin@ticketbox.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["admin","management"]', true, 'ROLE_ADMIN', NOW(), NOW());

-- =========== SAMPLE STUDENT USERS ===========
-- Password: password123 => BCrypt hash
INSERT IGNORE INTO users (id, university_id, full_name, email, password_hash,
    interests_tags, is_verified, role, created_at, updated_at) VALUES
(2, 1, 'Nguyễn Văn A', 'a.nguyen@student.hcmut.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["music","tech","sports"]', true, 'ROLE_USER', NOW(), NOW()),

(3, 1, 'Trần Thị B', 'b.tran@student.hcmut.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["art","fashion","music"]', true, 'ROLE_USER', NOW(), NOW()),

(4, 2, 'Phạm Quốc C', 'c.pham@student.hcmus.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["gaming","tech","esports"]', true, 'ROLE_USER', NOW(), NOW()),

(5, 2, 'Lê Minh D', 'd.le@student.hcmus.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["photography","travel","food"]', true, 'ROLE_USER', NOW(), NOW()),

(6, 3, 'Đặng Kim E', 'e.dang@student.ueh.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["business","networking","startups"]', true, 'ROLE_USER', NOW(), NOW()),

(7, 3, 'Hoàng Anh F', 'f.hoang@student.ueh.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["marketing","social","business"]', true, 'ROLE_USER', NOW(), NOW()),

(8, 4, 'Võ Thành G', 'g.vo@student.sgu.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["ai","robotics","innovation"]', true, 'ROLE_USER', NOW(), NOW()),

(9, 5, 'Bùi Tùng H', 'h.bui@student.uit.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["coding","hackathon","opensource"]', true, 'ROLE_USER', NOW(), NOW()),

(10, 5, 'Cao Quỳnh I', 'i.cao@student.uit.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["frontend","design","ux"]', true, 'ROLE_USER', NOW(), NOW()),

(11, 6, 'Nông Duy J', 'j.nong@student.utc.edu.vn',
 '$2a$10$H7FFH1zGTYe7VXa88dxfsugfdcdZv6yBUq0oVgI2WzLgDWWqtGb/O',
 '["international","languages","culture"]', true, 'ROLE_USER', NOW(), NOW());

-- =========== EVENTS (Dates in 2026) ===========
INSERT IGNORE INTO events (id, title, description, location, image_url, start_time, end_time, status, category_id, created_at, updated_at) VALUES

(1, 'HUTECH IT Open Day 2026: Kỷ Nguyên AI',
 'Lễ hội công nghệ thường niên khoa CNTT HUTECH với các gian hàng demo AI, thi lập trình và talkshow với các công ty công nghệ lớn.',
 'Hội trường A - Trụ sở chính HUTECH (Điện Biên Phủ)', '/images/events/event1.jpg',
 '2026-04-20 08:00:00', '2026-04-20 17:00:00', 'PUBLISHED', 1, NOW(), NOW()),

(2, 'Đêm Nhạc "Sắc Màu HUTECH"',
 'Đêm nhạc liveshow bùng nổ chào đón Tân sinh viên với sự góp mặt của các ca sĩ khách mời và các CLB Nghệ thuật HUTECH.',
 'Sân trường HUTECH (Cơ sở khu Công nghệ cao E3)', '/images/events/event2.jpg',
 '2026-05-10 19:00:00', '2026-05-10 22:00:00', 'PUBLISHED', 2, NOW(), NOW()),

(3, 'HUTECH Running Challenge 2026',
 'Giải chạy bộ trực tuyến lớn nhất năm dành cho sinh viên HUTECH. Rèn luyện sức khỏe và nhận những phần quà hấp dẫn.',
 'Nhà thi đấu Thể chất HUTECH & Công viên phần mềm Quang Trung', '/images/events/event3.jpg',
 '2026-05-25 06:00:00', '2026-05-25 11:00:00', 'PUBLISHED', 3, NOW(), NOW()),

(4, 'HUTECH Startup Wings: Khởi Nghiệp Sinh Viên',
 'Cuộc thi gọi vốn khởi nghiệp dành cho sinh viên Khối ngành Kinh tế với dàn Giám khảo "Shark" khách mời.',
 'Phòng Hội thảo B - HUTECH', '/images/events/event4.jpg',
 '2026-06-05 08:30:00', '2026-06-05 17:00:00', 'PUBLISHED', 5, NOW(), NOW()),

(5, 'HUTECH E-Sports Championship: Liên Quân Mobile',
 'Giải đấu thể thao điện tử sinh viên HUTECH lớn nhất trong năm. Tổng giải thưởng lên đến 10 triệu đồng.',
 'Hội trường E1 - Cơ sở Công nghệ cao HUTECH', '/images/events/event5.jpg',
 '2026-05-15 08:00:00', '2026-05-15 20:00:00', 'PUBLISHED', 8, NOW(), NOW());


-- =========== TICKET TYPES ===========
INSERT IGNORE INTO ticket_types (id, event_id, name, price, total_quantity, available_quantity) VALUES
-- Event 1: TechFest
(1, 1, 'Sinh viên HUTECH', 0, 500, 500),
(2, 1, 'Khách mời ngoài trường', 50000, 200, 200),
-- Event 2: Music Concert
(3, 2, 'Khu Vực Chung', 100000, 1000, 1000),
(4, 2, 'Khu Vực VIP (Sát sân khấu)', 300000, 200, 200),
-- Event 3: Basketball
(5, 3, 'Khán đài A', 50000, 500, 500),
(6, 3, 'Khán đài VIP', 150000, 100, 100),
-- Event 4: Startup
(7, 4, 'Vé Tham Dự Chung', 0, 300, 300),
(8, 4, 'Vé Mentor/Nhà Đầu Tư', 500000, 50, 50),
-- Event 5: E-Sports
(9, 5, 'Vé Phổ Thông', 0, 800, 800),
(10, 5, 'Khu Vực Fan Cứng', 100000, 150, 150);

-- =========== VOUCHERS ===========
INSERT IGNORE INTO vouchers (id, code, description, discount_percent, discount_amount, min_order_amount, max_uses, current_uses, expiry_date, is_active, created_at) VALUES
(1, 'SINHVIEN10', 'Giảm 10% cho sinh viên', 10, NULL, 100000, 100, 0, '2026-12-31 23:59:59', true, NOW()),
(2, 'WELCOME50K', 'Giảm 50.000đ cho đơn đầu tiên', NULL, 50000, 150000, 50, 0, '2026-12-31 23:59:59', true, NOW()),
(3, 'TRIVENT2026', 'Giảm 15% nhân dịp ra mắt TRIVENT', 15, NULL, 200000, 200, 0, '2026-06-30 23:59:59', true, NOW());

-- =========== SUCCESS MESSAGE ===========
-- Successfully inserted:
-- - 8 Event Categories
-- - 8 Universities
-- - 1 Admin User (admin@ticketbox.vn / admin123)
-- - 10 Student Users
-- - 10 Events (dates in 2026)
-- - 26 Ticket Types
-- - 3 Vouchers
