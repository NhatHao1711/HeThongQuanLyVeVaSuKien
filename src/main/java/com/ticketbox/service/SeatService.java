package com.ticketbox.service;

import com.ticketbox.dto.request.LockSeatRequest;
import com.ticketbox.dto.response.SeatResponse;
import com.ticketbox.entity.Seat;
import com.ticketbox.entity.TicketType;
import com.ticketbox.enums.SeatStatus;
import com.ticketbox.exception.BadRequestException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.SeatRepository;
import com.ticketbox.repository.TicketTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeatService {

    private final SeatRepository seatRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final StringRedisTemplate redisTemplate;

    private static final String SEAT_LOCK_PREFIX = "seat:lock:";
    private static final long SEAT_LOCK_DURATION_MINUTES = 10;

    public List<SeatResponse> getSeatsByTicketType(Long ticketTypeId) {
        List<Seat> seats = seatRepository.findByTicketTypeId(ticketTypeId);
        
        return seats.stream().map(seat -> {
            String status = seat.getStatus().name();
            // If it's available in DB, check if it's locked in Redis
            if (seat.getStatus() == SeatStatus.AVAILABLE) {
                String lockKey = SEAT_LOCK_PREFIX + seat.getId();
                if (Boolean.TRUE.equals(redisTemplate.hasKey(lockKey))) {
                    status = "LOCKED";
                }
            }
            return SeatResponse.builder()
                    .id(seat.getId())
                    .ticketTypeId(seat.getTicketType().getId())
                    .name(seat.getName())
                    .status(status)
                    .build();
        }).collect(Collectors.toList());
    }

    public void lockSeats(Long userId, LockSeatRequest request) {
        List<Long> seatIds = request.getSeatIds();
        
        // Check if any seat is already booked or locked
        for (Long seatId : seatIds) {
            Seat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Seat", "id", seatId));
            
            if (seat.getStatus() == SeatStatus.BOOKED) {
                throw new BadRequestException("Ghế " + seat.getName() + " đã được đặt.");
            }
            
            String lockKey = SEAT_LOCK_PREFIX + seatId;
            String existingLockUser = redisTemplate.opsForValue().get(lockKey);
            
            // If locked by someone else
            if (existingLockUser != null && !existingLockUser.equals(userId.toString())) {
                throw new BadRequestException("Ghế " + seat.getName() + " đang được giữ bởi người khác.");
            }
        }
        
        // Lock all seats
        for (Long seatId : seatIds) {
            String lockKey = SEAT_LOCK_PREFIX + seatId;
            redisTemplate.opsForValue().set(lockKey, userId.toString(), Duration.ofMinutes(SEAT_LOCK_DURATION_MINUTES));
        }
        
        log.info("User {} locked seats: {}", userId, seatIds);
    }

    public void unlockSeats(Long userId, LockSeatRequest request) {
        List<Long> seatIds = request.getSeatIds();
        for (Long seatId : seatIds) {
            String lockKey = SEAT_LOCK_PREFIX + seatId;
            String existingLockUser = redisTemplate.opsForValue().get(lockKey);
            if (existingLockUser != null && existingLockUser.equals(userId.toString())) {
                redisTemplate.delete(lockKey);
            }
        }
    }

    @Transactional
    public void generateSeats(Long ticketTypeId, String prefix, int count) {
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketType", "id", ticketTypeId));
        
        List<Seat> newSeats = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            String name = prefix + String.format("%02d", i);
            if (seatRepository.findByTicketTypeIdAndName(ticketTypeId, name).isEmpty()) {
                Seat seat = Seat.builder()
                        .ticketType(ticketType)
                        .name(name)
                        .status(SeatStatus.AVAILABLE)
                        .build();
                newSeats.add(seat);
            }
        }
        
        if (!newSeats.isEmpty()) {
            seatRepository.saveAll(newSeats);
            log.info("Generated {} seats for ticket type {}", newSeats.size(), ticketTypeId);
        }
    }
}
