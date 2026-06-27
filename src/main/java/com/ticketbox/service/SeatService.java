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
    private final com.ticketbox.repository.UserTicketRepository userTicketRepository;

    private static final String SEAT_LOCK_PREFIX = "seat:lock:";
    private static final long SEAT_LOCK_DURATION_MINUTES = 10;

    public List<SeatResponse> getSeatsByTicketType(Long ticketTypeId) {
        List<Seat> seats = seatRepository.findByTicketTypeId(ticketTypeId);
        
        return seats.stream().map(seat -> {
            String status = seat.getStatus().name();
            // If it's available in DB, check if it's locked in Redis or has a pending order
            if (seat.getStatus() == SeatStatus.AVAILABLE) {
                String lockKey = SEAT_LOCK_PREFIX + seat.getId();
                if (Boolean.TRUE.equals(redisTemplate.hasKey(lockKey)) || 
                    userTicketRepository.existsBySeatIdAndOrderPaymentStatus(seat.getId(), com.ticketbox.enums.PaymentStatus.PENDING)) {
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

    public List<com.ticketbox.dto.response.SeatGroupOptionResponse> findBestAvailableSeats(Long ticketTypeId, int quantity, List<Long> ignoreLockedSeatIds) {
        if (quantity <= 0) {
            throw new BadRequestException("Số lượng ghế phải lớn hơn 0");
        }

        List<Seat> allSeats = seatRepository.findByTicketTypeId(ticketTypeId);

        class SeatData {
            Seat seat;
            int rowIndex;
            int colIndex;
            double score;
            String statusStr;
        }

        List<SeatData> seatDataList = new ArrayList<>();
        int maxColIndex = 0;
        for (Seat seat : allSeats) {
            String statusStr = seat.getStatus().name();
            if (seat.getStatus() == SeatStatus.AVAILABLE) {
                String lockKey = SEAT_LOCK_PREFIX + seat.getId();
                if (Boolean.TRUE.equals(redisTemplate.hasKey(lockKey)) || 
                    userTicketRepository.existsBySeatIdAndOrderPaymentStatus(seat.getId(), com.ticketbox.enums.PaymentStatus.PENDING)) {
                    statusStr = "LOCKED";
                }
            }
            
            if (ignoreLockedSeatIds != null && ignoreLockedSeatIds.contains(seat.getId()) && !"BOOKED".equals(statusStr)) {
                statusStr = "AVAILABLE";
            }
            
            SeatData sd = new SeatData();
            sd.seat = seat;
            sd.statusStr = statusStr;
            
            String name = seat.getName();
            if (name != null && name.length() >= 2) {
                char rowChar = Character.toUpperCase(name.charAt(0));
                sd.rowIndex = rowChar - 'A';
                try {
                    sd.colIndex = Integer.parseInt(name.substring(1));
                } catch (NumberFormatException e) {
                    sd.colIndex = 999;
                }
            } else {
                sd.rowIndex = 999;
                sd.colIndex = 999;
            }
            if (sd.colIndex != 999 && sd.colIndex > maxColIndex) {
                maxColIndex = sd.colIndex;
            }
            seatDataList.add(sd);
        }

        double centerCol = maxColIndex / 2.0;
        for (SeatData sd : seatDataList) {
            if (sd.colIndex != 999) {
                double distanceToCenter = Math.abs(sd.colIndex - centerCol);
                sd.score = 100.0 - (sd.rowIndex * 10) - distanceToCenter;
            } else {
                sd.score = 0;
            }
        }


        java.util.Map<Integer, List<SeatData>> seatsByRow = seatDataList.stream()
                .collect(Collectors.groupingBy(sd -> sd.rowIndex));

        java.util.PriorityQueue<com.ticketbox.dto.response.SeatGroupOptionResponse> topOptions = new java.util.PriorityQueue<>(
                java.util.Comparator.comparingDouble(com.ticketbox.dto.response.SeatGroupOptionResponse::getTotalScore)
        );

        for (List<SeatData> rowSeats : seatsByRow.values()) {
            rowSeats.sort(java.util.Comparator.comparingInt(sd -> sd.colIndex));

            int n = rowSeats.size();
            if (n < quantity) continue;

            int left = 0;
            double currentWindowScore = 0;

            for (int right = 0; right < n; right++) {
                SeatData rightSeat = rowSeats.get(right);

                if (!"AVAILABLE".equals(rightSeat.statusStr)) {
                    left = right + 1;
                    currentWindowScore = 0;
                    continue;
                }

                if (right > left && rightSeat.colIndex != rowSeats.get(right - 1).colIndex + 1) {
                    left = right;
                    currentWindowScore = 0;
                }

                currentWindowScore += rightSeat.score;

                if (right - left + 1 == quantity) {
                    boolean leavesOrphanLeft = false;
                    if (left > 0 && 
                        "AVAILABLE".equals(rowSeats.get(left - 1).statusStr) && 
                        rowSeats.get(left - 1).colIndex == rowSeats.get(left).colIndex - 1) {
                        if (left == 1 || 
                            !"AVAILABLE".equals(rowSeats.get(left - 2).statusStr) || 
                            rowSeats.get(left - 2).colIndex != rowSeats.get(left - 1).colIndex - 1) {
                            leavesOrphanLeft = true;
                        }
                    }

                    boolean leavesOrphanRight = false;
                    if (right < n - 1 && 
                        "AVAILABLE".equals(rowSeats.get(right + 1).statusStr) && 
                        rowSeats.get(right + 1).colIndex == rowSeats.get(right).colIndex + 1) {
                        if (right == n - 2 || 
                            !"AVAILABLE".equals(rowSeats.get(right + 2).statusStr) || 
                            rowSeats.get(right + 2).colIndex != rowSeats.get(right + 1).colIndex + 1) {
                            leavesOrphanRight = true;
                        }
                    }

                    if (!leavesOrphanLeft && !leavesOrphanRight) {
                        List<SeatResponse> windowSeats = new ArrayList<>();
                        for (int i = left; i <= right; i++) {
                            Seat s = rowSeats.get(i).seat;
                            windowSeats.add(SeatResponse.builder()
                                .id(s.getId())
                                .ticketTypeId(s.getTicketType().getId())
                                .name(s.getName())
                                .status("AVAILABLE")
                                .build());
                        }
                        
                        topOptions.offer(new com.ticketbox.dto.response.SeatGroupOptionResponse(windowSeats, currentWindowScore));

                        if (topOptions.size() > 3) {
                            topOptions.poll();
                        }
                    }

                    currentWindowScore -= rowSeats.get(left).score;
                    left++;
                }
            }
        }

        List<com.ticketbox.dto.response.SeatGroupOptionResponse> result = new ArrayList<>();
        while (!topOptions.isEmpty()) {
            result.add(0, topOptions.poll());
        }
        return result;
    }
}
