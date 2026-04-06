package com.ticketbox.config;

import com.ticketbox.entity.Seat;
import com.ticketbox.entity.TicketType;
import com.ticketbox.enums.SeatStatus;
import com.ticketbox.repository.SeatRepository;
import com.ticketbox.repository.TicketTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeatInitializer implements CommandLineRunner {

    private final SeatRepository seatRepository;
    private final TicketTypeRepository ticketTypeRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking if testing seats need to be generated...");
        if (seatRepository.count() == 0) {
            List<TicketType> types = ticketTypeRepository.findAll();
            int seatsCreated = 0;
            for (TicketType type : types) {
                // Generate 100 seats for each ticket type
                List<Seat> seats = new ArrayList<>();
                for (int i = 1; i <= 100; i++) {
                    String row = String.valueOf((char) ('A' + (i - 1) / 10)); // A, B, C... J
                    int col = ((i - 1) % 10) + 1; // 1 to 10
                    String name = row + String.format("%02d", col);
                    
                    seats.add(Seat.builder()
                            .ticketType(type)
                            .name(name)
                            .status(SeatStatus.AVAILABLE)
                            .build());
                }
                seatRepository.saveAll(seats);
                seatsCreated += 100;
            }
            log.info("✅ Generated {} test seats across {} ticket types!", seatsCreated, types.size());
        } else {
            log.info("✓ Seats already exist in the database. Skipping seat generation.");
        }
    }
}
