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
    private final SeatHoldService seatHoldService;
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
                String existingLockUser = seatHoldService.getLockOwner(seat.getId());
                
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
        
        List<Character> rows = seats.stream()
                .map(s -> {
                    String name = s.getName();
                    return (name != null && name.length() > 0) ? Character.toUpperCase(name.charAt(0)) : 'A';
                })
                .distinct()
                .sorted()
                .collect(Collectors.toList());
                
        int totalRows = rows.size();
        
        List<Seat> vipSeats = new ArrayList<>();
        List<Seat> hardSellSeats = new ArrayList<>();
        
        for (Seat s : seats) {
            String name = s.getName();
            char row = (name != null && name.length() > 0) ? Character.toUpperCase(name.charAt(0)) : 'A';
            int rowIndex = rows.indexOf(row);
            
            if (rowIndex < 3) {
                vipSeats.add(s);
            } else if (totalRows >= 5 && rowIndex >= totalRows - 2) {
                hardSellSeats.add(s);
            }
        }
        
        // Hàng khó bán giảm 20% và làm tròn đến 10.000đ
        BigDecimal discountPerHardSell = basePrice.multiply(BigDecimal.valueOf(0.2));
        long rawHardSellPrice = Math.round(basePrice.subtract(discountPerHardSell).doubleValue() / 10000.0) * 10000;
        BigDecimal hardSellPrice = BigDecimal.valueOf(rawHardSellPrice);
        
        // Tính tổng tiền hụt dựa trên giá thực tế sau khi làm tròn
        BigDecimal actualDiscountPerHardSell = basePrice.subtract(hardSellPrice);
        BigDecimal totalDiscount = actualDiscountPerHardSell.multiply(BigDecimal.valueOf(hardSellSeats.size()));
        
        // Chia đều cho ghế VIP và làm tròn LÊN đến 10.000đ để đảm bảo không bao giờ hụt thu
        BigDecimal premiumPerVip = vipSeats.isEmpty() ? BigDecimal.ZERO : 
                totalDiscount.divide(BigDecimal.valueOf(vipSeats.size()), 2, java.math.RoundingMode.HALF_UP);
        long rawVipPrice = (long) Math.ceil(basePrice.add(premiumPerVip).doubleValue() / 10000.0) * 10000;
        BigDecimal vipPrice = BigDecimal.valueOf(rawVipPrice);
        
        // Giá thường làm tròn đến 10.000đ (thường thì basePrice đã chẵn, nhưng cứ làm tròn cho chắc)
        long rawNormalPrice = Math.round(basePrice.doubleValue() / 10000.0) * 10000;
        BigDecimal normalPrice = BigDecimal.valueOf(rawNormalPrice);
        
        for (Seat s : seats) {
            BigDecimal price;
            if (vipSeats.contains(s)) {
                price = vipPrice;
            } else if (hardSellSeats.contains(s)) {
                price = hardSellPrice;
            } else {
                price = normalPrice;
            }
            
            result.put(s.getId(), price);
        }
        
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
            String existingLockUser = seatHoldService.getLockOwner(seatId);
            
            // If locked by someone else
            if (existingLockUser != null && !existingLockUser.equals(userId.toString())) {
                throw new BadRequestException("Ghế " + seat.getName() + " đang được giữ bởi người khác.");
            }
        }
        
        // Lock all seats
        for (Long seatId : seatIds) {
            String lockKey = SEAT_LOCK_PREFIX + seatId;
            seatHoldService.holdSeat(seatId, userId, Duration.ofMinutes(paymentTimeoutMinutes));
        }
        
        log.info("User {} locked seats: {}", userId, seatIds);
    }

    public void unlockSeats(Long userId, LockSeatRequest request) {
        List<Long> seatIds = request.getSeatIds();
        for (Long seatId : seatIds) {
            String lockKey = SEAT_LOCK_PREFIX + seatId;
            seatHoldService.releaseSeatIfOwner(seatId, userId);
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
                String existingLockUser = seatHoldService.getLockOwner(seat.getId());
                
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
