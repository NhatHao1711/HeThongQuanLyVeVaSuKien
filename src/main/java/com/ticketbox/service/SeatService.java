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
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeatService {

    private final SeatRepository seatRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final StringRedisTemplate redisTemplate;
    private final com.ticketbox.repository.UserTicketRepository userTicketRepository;
    private final AdvancedSeatFinderService advancedSeatFinderService;

    @org.springframework.beans.factory.annotation.Value("${app.payment.timeout-minutes:10}")
    private int paymentTimeoutMinutes;

    private static final String SEAT_LOCK_PREFIX = "seat:lock:";

    public List<SeatResponse> getSeatsByTicketType(Long ticketTypeId, Long currentUserId) {
        List<Seat> seats = seatRepository.findByTicketTypeId(ticketTypeId);
        
        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId).orElse(null);
        BigDecimal basePrice = ticketType != null ? ticketType.getPrice() : BigDecimal.ZERO;
        
        // Áp dụng định giá động
        Map<Long, BigDecimal> seatPrices = calculateZeroSumPrices(seats, basePrice);
        
        return seats.stream().map(seat -> {
            String status = seat.getStatus().name();
            // If it's available in DB, check if it's locked in Redis or has a pending order
            if (seat.getStatus() == SeatStatus.AVAILABLE) {
                String lockKey = SEAT_LOCK_PREFIX + seat.getId();
                String existingLockUser = redisTemplate.opsForValue().get(lockKey);
                
                boolean isLockedBySomeoneElse = existingLockUser != null && (currentUserId == null || !existingLockUser.equals(currentUserId.toString()));
                
                if (isLockedBySomeoneElse || 
                    userTicketRepository.existsBySeatIdAndOrderPaymentStatus(seat.getId(), com.ticketbox.enums.PaymentStatus.PENDING)) {
                    status = "LOCKED";
                }
            }
            return SeatResponse.builder()
                    .id(seat.getId())
                    .ticketTypeId(seat.getTicketType().getId())
                    .name(seat.getName())
                    .status(status)
                    .price(seatPrices.getOrDefault(seat.getId(), basePrice))
                    .build();
        }).collect(Collectors.toList());
    }

    public Map<Long, BigDecimal> calculateZeroSumPrices(List<Seat> seats, BigDecimal basePrice) {
        if (seats == null || seats.isEmpty() || basePrice == null || basePrice.compareTo(BigDecimal.ZERO) == 0) return new HashMap<>();
        
        Map<Long, BigDecimal> result = new HashMap<>();
        if (seats.size() == 1) {
            result.put(seats.get(0).getId(), basePrice);
            return result;
        }
        
        int minRow = Integer.MAX_VALUE;
        int maxRow = Integer.MIN_VALUE;
        int minCol = Integer.MAX_VALUE;
        int maxCol = Integer.MIN_VALUE;
        
        for (Seat s : seats) {
            String name = s.getName();
            if (name == null || name.length() < 2) continue;
            int row = Character.toUpperCase(name.charAt(0));
            int col;
            try {
                col = Integer.parseInt(name.replaceAll("[^0-9]", ""));
            } catch (Exception e) {
                col = 0;
            }
            if (row < minRow) minRow = row;
            if (row > maxRow) maxRow = row;
            if (col < minCol) minCol = col;
            if (col > maxCol) maxCol = col;
        }
        
        double bestRow = minRow; // Gần màn hình chính nhất
        double bestCol = (minCol + maxCol) / 2.0; // Ở giữa theo chiều ngang
        
        double[] scores = new double[seats.size()];
        double sumScore = 0;
        for (int i = 0; i < seats.size(); i++) {
            Seat s = seats.get(i);
            String name = s.getName();
            int row = name != null && name.length() > 0 ? Character.toUpperCase(name.charAt(0)) : (int)bestRow;
            int col;
            try {
                col = Integer.parseInt(name.replaceAll("[^0-9]", ""));
            } catch (Exception e) {
                col = (int) bestCol;
            }
            
            // Trọng số hàng x2 vì khoảng cách giữa các hàng thường xa hơn khoảng cách giữa 2 ghế
            double rowDist = (row - bestRow) * 2.0; 
            double colDist = (col - bestCol);
            
            double dist = Math.sqrt(rowDist * rowDist + colDist * colDist);
            double score = -dist; // Ghế gần trung tâm điểm cao
            scores[i] = score;
            sumScore += score;
        }
        
        double meanScore = sumScore / seats.size();
        double[] adjustedScores = new double[seats.size()];
        double maxAdjustedScore = 0;
        for (int i = 0; i < seats.size(); i++) {
            adjustedScores[i] = scores[i] - meanScore;
            if (adjustedScores[i] > maxAdjustedScore) {
                maxAdjustedScore = adjustedScores[i];
            }
        }
        
        // Biến động tối đa 20%
        double maxDeviationPercent = 0.20; 
        double maxDeltaCurrency = basePrice.doubleValue() * maxDeviationPercent;
        
        double scale = 0;
        if (maxAdjustedScore > 0) {
            scale = maxDeltaCurrency / maxAdjustedScore;
        }
        
        BigDecimal totalAssigned = BigDecimal.ZERO;
        for (int i = 0; i < seats.size() - 1; i++) {
            double delta = adjustedScores[i] * scale;
            long priceLong = Math.round((basePrice.doubleValue() + delta) / 1000.0) * 1000; // Làm tròn tới nghìn đồng
            BigDecimal price = BigDecimal.valueOf(priceLong);
            result.put(seats.get(i).getId(), price);
            totalAssigned = totalAssigned.add(price);
        }
        
        // Ghế cuối cùng gánh phần dư để đảm bảo chuẩn Zero-Sum
        BigDecimal totalExpected = basePrice.multiply(BigDecimal.valueOf(seats.size()));
        BigDecimal lastPrice = totalExpected.subtract(totalAssigned);
        result.put(seats.get(seats.size() - 1).getId(), lastPrice);
        
        return result;
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
            redisTemplate.opsForValue().set(lockKey, userId.toString(), Duration.ofMinutes(paymentTimeoutMinutes));
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

    public List<com.ticketbox.dto.response.SeatGroupOptionResponse> findBestAvailableSeats(Long ticketTypeId, int quantity, List<Long> ignoreLockedSeatIds, Long currentUserId) {
        if (quantity <= 0) {
            throw new BadRequestException("Số lượng ghế phải lớn hơn 0");
        }

        List<Seat> allSeats = seatRepository.findByTicketTypeId(ticketTypeId);
        
        // 1. Lọc ra danh sách các ghế đang bị khóa (bởi user khác hoặc đang chờ thanh toán)
        List<Long> actualLockedSeatIds = new ArrayList<>();
        for (Seat seat : allSeats) {
            if (seat.getStatus() == SeatStatus.AVAILABLE) {
                String lockKey = SEAT_LOCK_PREFIX + seat.getId();
                String existingLockUser = redisTemplate.opsForValue().get(lockKey);
                
                boolean isLockedBySomeoneElse = existingLockUser != null && (currentUserId == null || !existingLockUser.equals(currentUserId.toString()));
                boolean isPending = userTicketRepository.existsBySeatIdAndOrderPaymentStatus(seat.getId(), com.ticketbox.enums.PaymentStatus.PENDING);
                
                if (isLockedBySomeoneElse || isPending) {
                    // Nếu ghế này bị khóa, nhưng nó nằm trong danh sách "cho phép bỏ qua" (tức là ghế của chính user hiện tại đang click)
                    // thì KHÔNG đưa vào actualLockedSeatIds
                    if (ignoreLockedSeatIds == null || !ignoreLockedSeatIds.contains(seat.getId())) {
                        actualLockedSeatIds.add(seat.getId());
                    }
                }
            }
        }

        TicketType ticketType = ticketTypeRepository.findById(ticketTypeId).orElse(null);
        BigDecimal basePrice = ticketType != null ? ticketType.getPrice() : BigDecimal.ZERO;
        Map<Long, BigDecimal> seatPrices = calculateZeroSumPrices(allSeats, basePrice);

        // 2. Gọi thuật toán Hyper-Optimized Seat Finder (Giai đoạn 1: Sliding Window, Giai đoạn 2: BFS)
        List<Seat> bestSeats = advancedSeatFinderService.findHyperOptimizedSeats(allSeats, quantity, actualLockedSeatIds, seatPrices);

        // 3. Nếu không tìm thấy, trả về list rỗng
        if (bestSeats == null || bestSeats.isEmpty()) {
            return new ArrayList<>();
        }

        // 4. Map kết quả thành DTO
        List<SeatResponse> windowSeats = bestSeats.stream().map(s -> SeatResponse.builder()
                .id(s.getId())
                .ticketTypeId(s.getTicketType().getId())
                .name(s.getName())
                .status("AVAILABLE")
                .price(seatPrices.getOrDefault(s.getId(), basePrice))
                .build()).collect(Collectors.toList());

        // Tính tổng tiền của option
        double totalOptionPrice = bestSeats.stream()
                .mapToDouble(s -> seatPrices.getOrDefault(s.getId(), basePrice).doubleValue())
                .sum();

        com.ticketbox.dto.response.SeatGroupOptionResponse bestOption = new com.ticketbox.dto.response.SeatGroupOptionResponse(windowSeats, totalOptionPrice);
        
        List<com.ticketbox.dto.response.SeatGroupOptionResponse> result = new ArrayList<>();
        result.add(bestOption);
        return result;
    }
}
