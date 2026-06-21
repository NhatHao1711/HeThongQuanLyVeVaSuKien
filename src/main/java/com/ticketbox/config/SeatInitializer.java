package com.ticketbox.config;

import com.ticketbox.entity.Seat;
import com.ticketbox.entity.TicketType;
import com.ticketbox.enums.SeatStatus;
import com.ticketbox.repository.SeatRepository;
import com.ticketbox.repository.TicketTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Tự động sinh ghế ngồi cho mọi TicketType chưa có ghế.
 * Chạy SAU DataInitializer (@Order(2)) để đảm bảo ticket_types đã được tạo trước.
 *
 * Mỗi TicketType được cấp 100 ghế theo sơ đồ A01-J10.
 * Nếu một TicketType đã có ghế → bỏ qua, không tạo thêm (idempotent).
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class SeatInitializer implements CommandLineRunner {

    private final SeatRepository seatRepository;
    private final TicketTypeRepository ticketTypeRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<TicketType> allTypes = ticketTypeRepository.findAll();
        if (allTypes.isEmpty()) {
            log.info("⚠️  Chưa có TicketType nào trong DB. Bỏ qua tạo ghế.");
            return;
        }

        int totalCreated = 0;
        int skipped = 0;

        for (TicketType type : allTypes) {
            // Kiểm tra ticket type này đã có ghế chưa
            long existingCount = seatRepository.countByTicketTypeId(type.getId());
            if (existingCount > 0) {
                skipped++;
                continue; // Đã có ghế → bỏ qua
            }

            // Chưa có ghế → tạo 100 ghế A01-J10
            List<Seat> seats = new ArrayList<>();
            for (int i = 1; i <= 100; i++) {
                String row = String.valueOf((char) ('A' + (i - 1) / 10)); // A, B, C... J
                int col = ((i - 1) % 10) + 1;                            // 1 to 10
                String name = row + String.format("%02d", col);           // e.g. A01, B05

                seats.add(Seat.builder()
                        .ticketType(type)
                        .name(name)
                        .status(SeatStatus.AVAILABLE)
                        .build());
            }
            seatRepository.saveAll(seats);
            totalCreated += 100;
            log.info("  → Tạo 100 ghế cho TicketType [{}] \"{}\"", type.getId(), type.getName());
        }

        if (totalCreated > 0) {
            log.info("✅ SeatInitializer: Tạo tổng {} ghế mới ({} ticket type mới, {} ticket type đã có ghế bỏ qua).",
                    totalCreated, totalCreated / 100, skipped);
        } else {
            log.info("✓  SeatInitializer: Tất cả {} ticket type đã có ghế. Không cần tạo thêm.", skipped);
        }
    }
}

