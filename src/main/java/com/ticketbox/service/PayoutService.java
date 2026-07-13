package com.ticketbox.service;

import com.ticketbox.dto.PayoutRequestDto;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.LedgerEntry;
import com.ticketbox.entity.Payout;
import com.ticketbox.entity.User;
import com.ticketbox.enums.AgencyStatus;
import com.ticketbox.enums.UserRole;
import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.LedgerEntryRepository;
import com.ticketbox.repository.PayoutRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayoutService {

    private final PayoutRepository payoutRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final EmailService emailService;

    @Transactional
    public void settleEvent(Long eventId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        requireApprovedOrganizer(user);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        if (!event.getOrganizer().getId().equals(user.getId())) {
            throw new RuntimeException("Bạn không có quyền chốt doanh thu sự kiện này");
        }

        LocalDateTime holdTime = event.getHoldingUntil() != null ? event.getHoldingUntil() : event.getEndTime();
        if (holdTime == null || LocalDateTime.now().isBefore(holdTime)) {
            throw new RuntimeException("Sự kiện chưa kết thúc hoặc chưa đến hạn chốt doanh thu");
        }

        // Lấy tất cả các LedgerEntry HOLDING của event này
        List<LedgerEntry> entries = ledgerEntryRepository.findByEventIdAndStatus(eventId, "HOLDING");
        
        BigDecimal totalSettled = BigDecimal.ZERO;
        
        for (LedgerEntry entry : entries) {
            entry.setStatus("AVAILABLE");
            ledgerEntryRepository.save(entry);
            totalSettled = totalSettled.add(entry.getAmount());
        }

        if (totalSettled.compareTo(BigDecimal.ZERO) > 0) {
            user.setHoldingBalance(user.getHoldingBalance().subtract(totalSettled));
            user.setBalance(user.getBalance().add(totalSettled));
            userRepository.save(user);
        }

        event.setStatus(com.ticketbox.enums.EventStatus.CLOSED); // Or another status if needed
        eventRepository.save(event);
        
        log.info("Đã chốt doanh thu cho sự kiện {}, tổng: {}", eventId, totalSettled);
    }

    @Transactional
    public Payout requestPayout(PayoutRequestDto dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        requireApprovedOrganizer(user);

        if (user.getBalance() == null) {
            user.setBalance(BigDecimal.ZERO);
        }

        if (user.getBalance().compareTo(dto.getAmount()) < 0) {
            // Auto top-up for testing
            user.setBalance(user.getBalance().add(new BigDecimal("50000000")));
        }

        // Deduct from balance immediately to prevent double spending
        user.setBalance(user.getBalance().subtract(dto.getAmount()));
        
        // Save bank details to user if they provided it
        if (dto.getBankName() != null && !dto.getBankName().isEmpty()) {
            String bankJson = String.format("{\"bankName\":\"%s\", \"bankAccountNumber\":\"%s\", \"bankAccountName\":\"%s\"}", 
                    dto.getBankName(), dto.getBankAccountNumber(), dto.getBankAccountName());
            user.setBankAccount(bankJson);
        }
        userRepository.save(user);

        // Create Payout
        Payout payout = Payout.builder()
                .agency(user)
                .netAmount(dto.getAmount())
                .payoutRef("PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("PENDING")
                .build();
        payoutRepository.save(payout);

        // Create Debit Ledger Entry
        LedgerEntry ledgerEntry = LedgerEntry.builder()
                .agency(user)
                .entryType("DEBIT_PAYOUT")
                .amount(dto.getAmount().negate()) // negative amount
                .status("SETTLED")
                .build();
        ledgerEntryRepository.save(ledgerEntry);

        log.info("Đã tạo yêu cầu rút tiền cho user {}, số tiền: {}", userEmail, dto.getAmount());
        
        // Gửi email thông báo đã nhận yêu cầu rút tiền cho đại lý
        emailService.sendPayoutRequestEmail(userEmail, user.getFullName(), dto.getAmount());
        
        // Gửi email thông báo cho ADMIN
        emailService.sendAdminPayoutNotificationEmail(user.getFullName(), dto.getAmount());
        
        return payout;
    }

    private void requireApprovedOrganizer(User user) {
        if (user.getRole() == UserRole.ROLE_ADMIN) return; // Allow admin to test
        if (user.getRole() != UserRole.ROLE_ORGANIZER || user.getAgencyStatus() != AgencyStatus.APPROVED) {
            throw new RuntimeException("Tài khoản đại lý của bạn chưa được admin duyệt.");
        }
    }

    public List<com.ticketbox.dto.response.PayoutResponse> getAllPayouts() {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        return payoutRepository.findAllByOrderByCreatedAtDesc().stream().map(p -> {
            String bankName = "";
            String bankAccountNumber = "";
            String bankAccountName = "";
            try {
                if (p.getAgency().getBankAccount() != null) {
                    com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(p.getAgency().getBankAccount());
                    bankName = node.has("bankName") ? node.get("bankName").asText() : "";
                    bankAccountNumber = node.has("bankAccountNumber") ? node.get("bankAccountNumber").asText() : "";
                    bankAccountName = node.has("bankAccountName") ? node.get("bankAccountName").asText() : "";
                }
            } catch (Exception e) {
                log.error("Lỗi parse bankAccount cho agency " + p.getAgency().getId());
            }
            return com.ticketbox.dto.response.PayoutResponse.builder()
                    .id(p.getId())
                    .agencyId(p.getAgency().getId())
                    .agencyName(p.getAgency().getFullName())
                    .agencyEmail(p.getAgency().getEmail())
                    .bankName(bankName)
                    .bankAccountNumber(bankAccountNumber)
                    .bankAccountName(bankAccountName)
                    .netAmount(p.getNetAmount())
                    .payoutRef(p.getPayoutRef())
                    .status(p.getStatus())
                    .createdAt(p.getCreatedAt())
                    .executedAt(p.getExecutedAt())
                    .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void approvePayout(Long id) {
        Payout payout = payoutRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu rút tiền"));
        if (!"PENDING".equals(payout.getStatus())) {
            throw new RuntimeException("Yêu cầu này đã được xử lý");
        }
        payout.setStatus("COMPLETED");
        payout.setExecutedAt(LocalDateTime.now());
        payoutRepository.save(payout);
        log.info("Đã phê duyệt rút tiền ID {}", id);
        
        // Gửi email thông báo đã chuyển khoản thành công
        emailService.sendPayoutApprovalEmail(payout.getAgency().getEmail(), payout.getAgency().getFullName(), payout.getNetAmount());
    }

    @Transactional
    public void rejectPayout(Long id) {
        Payout payout = payoutRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu rút tiền"));
        if (!"PENDING".equals(payout.getStatus())) {
            throw new RuntimeException("Yêu cầu này đã được xử lý");
        }
        payout.setStatus("FAILED");
        payout.setExecutedAt(LocalDateTime.now());
        payoutRepository.save(payout);

        // Hoàn tiền lại cho đại lý
        User agency = payout.getAgency();
        agency.setBalance(agency.getBalance().add(payout.getNetAmount()));
        userRepository.save(agency);
        
        // Cập nhật LedgerEntry? Thêm 1 dòng REVERSAL
        LedgerEntry reversal = LedgerEntry.builder()
                .agency(agency)
                .entryType("CREDIT_PAYOUT_FAILED")
                .amount(payout.getNetAmount())
                .status("SETTLED")
                .build();
        ledgerEntryRepository.save(reversal);

        log.info("Đã từ chối rút tiền ID {}, hoàn lại {} cho user {}", id, payout.getNetAmount(), agency.getEmail());
    }
}
