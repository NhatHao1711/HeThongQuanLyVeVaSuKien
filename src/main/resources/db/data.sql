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
INSERT IGNORE INTO events (id, title, description, location, start_time, end_time, status, category_id, created_at, updated_at) VALUES

(1, 'TechFest 2026 - Lễ Hội Công Nghệ',
 'Lễ hội công nghệ lớn nhất TP.HCM với các buổi talk, workshop, demo từ các công ty tech hàng đầu. Nơi gặp gỡ, học hỏi và networking với các bạn cùng đam mê công nghệ.',
 'Tầng 10-12, Tòa nhà Bitexco Financial Tower, Quận 1, TP.HCM',
 '2026-04-20 08:00:00', '2026-04-20 17:00:00', 'PUBLISHED', 1, NOW(), NOW()),

(2, 'Concert Mỹ Tâm - Liveshow "Đêm Nhạc Xuân"',
 'Liveshow nhạc trực tiếp từ nữ ca sĩ nổi tiếng Mỹ Tâm. Những bài hát hit được biểu diễn lại với khung nhạc mới lạ. Tham dự để có một đêm âm nhạc tuyệt vời!',
 'Nhà hát Hòa Bình, 240 Đường 3 Tháng 2, Quận 10, TP.HCM',
 '2026-05-10 19:00:00', '2026-05-10 22:00:00', 'PUBLISHED', 2, NOW(), NOW()),

(3, 'Music Festival - Fest Chào Hè 2026',
 'Festival âm nhạc multi-genre với sự tham gia của hơn 20 ban nhạc/artist. Từ nhạc Pop, Rock, Indie đến Trap. Cơ hội tuyệt vời để khám phá âm nhạc.',
 'Phú Mỹ Hưng, Quận 7, TP.HCM',
 '2026-05-20 13:00:00', '2026-05-21 23:59:00', 'PUBLISHED', 2, NOW(), NOW()),

(4, 'Marathon 2026 - Chạy Vì Sứ Mệnh',
 'Giải chạy marathon từ thiện. Tham dự để rèn luyện bản thân đồng thời đóng góp cho cộng đồng. Có khoảng cách 5K, 10K, 21K và 42K.',
 'Công viên Tao Đàn, Quận 1, TP.HCM',
 '2026-06-01 05:30:00', '2026-06-01 12:00:00', 'PUBLISHED', 3, NOW(), NOW()),

(5, 'Basketball Championship - SV TP.HCM 2026',
 'Giải bóng rổ sinh viên toàn thành phố. Các đội từ các trường đại học sẽ tranh tài trong những trận đấu kịch tính. Đến cổ vũ đội bạn!',
 'Nhà thi đấu Phú Thọ, Quận 11, TP.HCM',
 '2026-05-25 16:00:00', '2026-05-25 21:00:00', 'PUBLISHED', 3, NOW(), NOW()),

(6, 'Triển Lãm Nghệ Thuật Đương Đại 2026',
 'Triển lãm tranh sơn dầu, tranh tường, điêu khắc từ các nghệ sĩ trẻ TP.HCM. Tự do thưởng thức, đặc biệt có buổi ra mắt riêng cho artist.',
 'Bảo tàng Mỹ thuật TP.HCM, 97A Phó Đức Chính, Quận 1',
 '2026-04-10 10:00:00', '2026-04-30 18:00:00', 'PUBLISHED', 4, NOW(), NOW()),

(7, 'Culture Fest - Hội Tụ Các Nền Văn Hóa',
 'Sự kiện giao lưu văn hóa quốc tế. Các quốc gia khác nhau sẽ giới thiệu ẩm thực, trang phục truyền thống, nhạc, múa đặc sắc của mình.',
 'Công viên Tao Đàn, Quận 1, TP.HCM',
 '2026-05-15 14:00:00', '2026-05-15 20:00:00', 'PUBLISHED', 4, NOW(), NOW()),

(8, 'Startup Summit 2026',
 'Sự kiện dành cho các startup, nhà đầu tư, mentor trong lĩnh vực khởi nghiệp. Pitch idea, tìm kiếm vốn và đối tác kinh doanh.',
 'GEM Center, 8 Nguyễn Bỉnh Khiêm, Quận 1, TP.HCM',
 '2026-06-05 08:30:00', '2026-06-05 17:00:00', 'PUBLISHED', 5, NOW(), NOW()),

(9, 'Hội Thảo Tuyển Dụng - Cơ Hội Việc Làm 2026',
 'Hội thảo tuyển dụng có sự tham gia của hơn 50 công ty lớn. Cơ hội gặp gỡ HR trực tiếp, nộp CV và phỏng vấn. Dành cho SV năm 3, 4.',
 'Hội trường Đại học Bách Khoa, Quận 10, TP.HCM',
 '2026-04-18 09:00:00', '2026-04-18 16:00:00', 'PUBLISHED', 6, NOW(), NOW()),

(10, 'Street Food Festival 2026',
 'Tổng hợp các quán ăn, đồ ăn vặt ở khắp TP.HCM. Từ bánh mì, phở tới các đặc sản từ Bắc Trung Nam. Nhịp đập của thành phố qua ẩm thực!',
 'Chợ Bến Thành, Quận 1, TP.HCM',
 '2026-05-05 11:00:00', '2026-05-05 22:00:00', 'PUBLISHED', 7, NOW(), NOW());

-- =========== TICKET TYPES ===========
INSERT IGNORE INTO ticket_types (id, event_id, name, price, total_quantity, available_quantity) VALUES
-- Event 1: TechFest
(1, 1, 'Early Bird', 150000, 200, 200),
(2, 1, 'Standard', 200000, 300, 300),
(3, 1, 'VIP', 350000, 100, 100),
(4, 1, 'VIP Pro (Lunch + T-shirt)', 500000, 50, 50),
-- Event 2: Music Concert
(5, 2, 'Standard', 250000, 500, 500),
(6, 2, 'VIP Seat', 450000, 200, 200),
(7, 2, 'VIP Pro + Meet & Greet', 750000, 50, 50),
-- Event 3: Music Festival
(8, 3, '1 Day Pass', 180000, 1000, 1000),
(9, 3, '2 Days Pass', 300000, 500, 500),
(10, 3, 'VIP 2 Days', 600000, 100, 100),
-- Event 4: Marathon
(11, 4, '5K Run', 100000, 300, 300),
(12, 4, '10K Run', 150000, 300, 300),
(13, 4, '21K Run', 250000, 200, 200),
(14, 4, '42K Marathon', 350000, 100, 100),
-- Event 5: Basketball
(15, 5, 'Standard', 100000, 1000, 1000),
(16, 5, 'VIP', 250000, 200, 200),
-- Event 6: Art Exhibition
(17, 6, 'Normal Entry', 50000, 500, 500),
(18, 6, 'VIP + Catalog', 150000, 100, 100),
-- Event 7: Culture Fest
(19, 7, 'General', 80000, 800, 800),
(20, 7, 'VIP + Food Coupon', 200000, 150, 150),
-- Event 8: Startup Summit
(21, 8, 'Startup Ticket', 300000, 300, 300),
(22, 8, 'Investor Ticket', 700000, 100, 100),
(23, 8, 'Mentor Ticket', 500000, 50, 50),
-- Event 9: Recruitment Fair
(24, 9, 'Free Entry', 0, 1000, 1000),
-- Event 10: Street Food Festival
(25, 10, 'General Entry', 70000, 2000, 2000),
(26, 10, 'Food Lover Pass', 300000, 300, 300);

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
