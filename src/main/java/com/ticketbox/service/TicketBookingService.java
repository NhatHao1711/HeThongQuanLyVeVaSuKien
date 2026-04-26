package com.ticketbox.service;

import com.ticketbox.dto.request.BookingRequest;
import com.ticketbox.dto.response.BookingResponse;
import com.ticketbox.entity.Order;
import com.ticketbox.entity.TicketType;
import com.ticketbox.entity.User;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.enums.CheckinStatus;
import com.ticketbox.enums.PaymentStatus;
import com.ticketbox.exception.BadRequestException;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.exception.TicketSoldOutException;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.TicketTypeRepository;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.repository.UserTicketRepository;
import com.ticketbox.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.ticketbox.repository.SeatRepository;
import com.ticketbox.entity.Seat;
import com.ticketbox.enums.SeatStatus;

/**
 * TicketBookingService - Nhiệm vụ A: Chống Over-selling
 *
 * Sử dụng Redis Distributed Lock (Redisson) để đảm bảo an toàn dữ liệu
 * khi hàng ngàn sinh viên truy cập đặt vé cùng lúc.
 *
 * Flow:
 * 1. Acquire distributed lock cho ticketTypeId cụ thể
 * 2. Kiểm tra available_quantity
 * 3. Trừ available_quantity
 * 4. Tạo Order + UserTicket(s)
 * 5. Release lock
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TicketBookingService {

    private final TicketTypeRepository ticketTypeRepository;
    private final OrderRepository orderRepository;
    private final UserTicketRepository userTicketRepository;
    private final UserRepository userRepository;
    private final RedissonClient redissonClient;
    private final com.ticketbox.util.AESUtil aesUtil;
    private final EmailService emailService;
    private final VoucherRepository voucherRepository;
    private final SeatRepository seatRepository;
    private final StringRedisTemplate redisTemplate;
    private final TransactionTemplate transactionTemplate;

    private static final String LOCK_PREFIX = "lock:ticket:";
    private static final String SEAT_LOCK_PREFIX = "seat:lock:";
    private static final long LOCK_WAIT_TIME = 5;  // seconds to wait for lock
    private static final long LOCK_LEASE_TIME = 10; // seconds lock auto-release

    public BookingResponse bookTicket(Long userId, BookingRequest request) {
        Long ticketTypeId = request.getTicketTypeId();
        int quantity = request.getQuantity();
        List<Long> seatIds = request.getSeatIds();

        if (seatIds != null && !seatIds.isEmpty()) {
            if (seatIds.size() != quantity) {
                throw new BadRequestException("Số lượng ghế chọn không khớp với số lượng vé!");
            }
        }

        // 1. Acquire Distributed Lock
        String lockKey = LOCK_PREFIX + ticketTypeId;
        RLock lock = redissonClient.getLock(lockKey);

        try {
            boolean isLocked = lock.tryLock(LOCK_WAIT_TIME, LOCK_LEASE_TIME, TimeUnit.SECONDS);

            if (!isLocked) {
                throw new BadRequestException(
                        "Hệ thống đang bận xử lý. Vui lòng thử lại sau vài giây.");
            }

            log.info("🔒 Acquired lock for ticketTypeId={}, userId={}", ticketTypeId, userId);

            return transactionTemplate.execute(status -> {
                // 2. Load TicketType & check availability
                TicketType ticketType = ticketTypeRepository.findById(ticketTypeId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "TicketType", "id", ticketTypeId));

                if (ticketType.getAvailableQuantity() < quantity) {
                    throw new TicketSoldOutException(ticketTypeId, quantity,
                            ticketType.getAvailableQuantity());
                }

                // 2.5 Seat Lock Verification
                List<Seat> bookingSeats = new ArrayList<>();
                if (seatIds != null && !seatIds.isEmpty()) {
                    for (Long seatId : seatIds) {
                        Seat seat = seatRepository.findById(seatId)
                                .orElseThrow(() -> new ResourceNotFoundException("Seat", "id", seatId));
                        if (!seat.getTicketType().getId().equals(ticketTypeId)) {
                            throw new BadRequestException("Ghế " + seat.getName() + " không thuộc loại vé này.");
                        }
                        if (seat.getStatus() == SeatStatus.BOOKED) {
                            throw new BadRequestException("Ghế " + seat.getName() + " đã được đặt.");
                        }
                        String seatLockKey = SEAT_LOCK_PREFIX + seatId;
                        String lockUser = redisTemplate.opsForValue().get(seatLockKey);
                        if (lockUser == null || !lockUser.equals(userId.toString())) {
                            throw new BadRequestException("Ghế " + seat.getName() + " chưa được bạn giữ hoặc đã hết hạn giữ chỗ.");
                        }
                        bookingSeats.add(seat);
                    }
                }

                // 3. Deduct available quantity (CRITICAL SECTION)
                ticketType.setAvailableQuantity(ticketType.getAvailableQuantity() - quantity);
                ticketTypeRepository.save(ticketType);

                log.info("✅ Deducted {} tickets. Remaining: {}", quantity,
                        ticketType.getAvailableQuantity());

                // 4. Load User
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

                // 5. Create Order (with optional voucher)
                BigDecimal totalAmount = ticketType.getPrice()
                        .multiply(BigDecimal.valueOf(quantity));
                String transactionRef = "TXN-" + UUID.randomUUID().toString().substring(0, 12)
                        .toUpperCase();

                // 5.5 Apply voucher if provided
                String appliedVoucherCode = null;
                BigDecimal discountAmount = BigDecimal.ZERO;
                if (request.getVoucherCode() != null && !request.getVoucherCode().trim().isEmpty()) {
                    var voucherOpt = voucherRepository.findByCode(request.getVoucherCode().trim());
                    if (voucherOpt.isPresent()) {
                        var voucher = voucherOpt.get();
                        if (voucher.isValid()) {
                            long discount = voucher.calculateDiscount(totalAmount.longValue());
                            discountAmount = BigDecimal.valueOf(discount);
                            totalAmount = totalAmount.subtract(discountAmount);
                            if (totalAmount.compareTo(BigDecimal.ZERO) < 0) totalAmount = BigDecimal.ZERO;
                            appliedVoucherCode = voucher.getCode();
                            // Increment usage
                            voucher.setCurrentUses(voucher.getCurrentUses() + 1);
                            voucherRepository.save(voucher);
                            log.info("🏷️ Voucher {} applied: discount={}, newTotal={}", voucher.getCode(), discount, totalAmount);
                        }
                    }
                }

                Order order = Order.builder()
                        .user(user)
                        .totalAmount(totalAmount)
                        .paymentStatus(PaymentStatus.PENDING)
                        .transactionRef(transactionRef)
                        .voucherCode(appliedVoucherCode)
                        .discountAmount(discountAmount)
                        .build();

                order = orderRepository.save(order);

                // 6. Create UserTickets
                List<UserTicket> tickets = new ArrayList<>();
                for (int i = 0; i < quantity; i++) {
                    Seat seat = null;
                    if (!bookingSeats.isEmpty() && i < bookingSeats.size()) {
                        seat = bookingSeats.get(i);
                        seat.setStatus(SeatStatus.BOOKED);
                        seatRepository.save(seat);
                        
                        // Clear Redis lock immediately since it's booked
                        redisTemplate.delete(SEAT_LOCK_PREFIX + seat.getId());
                    }

                    UserTicket ticket = UserTicket.builder()
                            .order(order)
                            .ticketType(ticketType)
                            .user(user)
                            .checkinStatus(CheckinStatus.UNUSED)
                            .seat(seat)
                            .build();
                    tickets.add(ticket);
                }
                userTicketRepository.saveAll(tickets);

                // 6.5 Generate QR tokens for each ticket
                for (UserTicket ticket : tickets) {
                    String qrToken = aesUtil.generateQrTokenContent(ticket.getId(), user.getId());
                    ticket.setQrToken(qrToken);
                }
                userTicketRepository.saveAll(tickets);

                log.info("📦 Created Order #{} with {} tickets for user #{}",
                        order.getId(), quantity, userId);

                // 6.6 Send booking confirmation email with QR code
                try {
                    // Do not expose QR Code for PENDING orders in email
                    String firstQrToken = null;
                    emailService.sendBookingConfirmation(
                        user.getEmail(),
                        user.getFullName(),
                        ticketType.getEvent().getTitle(),
                        ticketType.getName(),
                        quantity,
                        totalAmount,
                        transactionRef,
                        firstQrToken
                    );
                } catch (Exception e) {
                    log.warn("⚠️ Failed to send email: {}", e.getMessage());
                }

                // 7. Return response
                return BookingResponse.builder()
                        .orderId(order.getId())
                        .transactionRef(transactionRef)
                        .totalAmount(totalAmount)
                        .ticketCount(quantity)
                        .ticketTypeName(ticketType.getName())
                        .paymentStatus(PaymentStatus.PENDING.name())
                        .build();
            });

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Bị gián đoạn khi chờ xử lý đặt vé");
        } finally {
            // 8. Release lock
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.info("🔓 Released lock for ticketTypeId={}", ticketTypeId);
            }
        }
    }
}
