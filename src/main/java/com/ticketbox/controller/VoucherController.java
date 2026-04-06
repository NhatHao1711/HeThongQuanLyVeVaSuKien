package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.Voucher;
import com.ticketbox.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherRepository voucherRepository;

    // Public: get active vouchers for display on website
    @GetMapping("/active")
    public ApiResponse<List<Map<String, Object>>> getActiveVouchers() {
        List<Map<String, Object>> result = voucherRepository.findAll().stream()
                .filter(Voucher::isValid)
                .map(v -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("code", v.getCode());
                    m.put("description", v.getDescription());
                    m.put("discountPercent", v.getDiscountPercent());
                    m.put("discountAmount", v.getDiscountAmount());
                    m.put("expiryDate", v.getExpiryDate());
                    m.put("remainingUses", v.getMaxUses() != null ? v.getMaxUses() - v.getCurrentUses() : null);
                    return m;
                })
                .collect(java.util.stream.Collectors.toList());
        return ApiResponse.success(result);
    }

    // Admin: list all vouchers
    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<List<Voucher>> getAllVouchers() {
        return ApiResponse.success(voucherRepository.findAll());
    }

    // Admin: create voucher
    @PostMapping("/admin")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<Voucher> createVoucher(@RequestBody Voucher voucher) {
        if (voucherRepository.findByCode(voucher.getCode()).isPresent()) {
            return ApiResponse.error("Mã voucher đã tồn tại");
        }
        return ApiResponse.success(voucherRepository.save(voucher));
    }

    // Admin: delete voucher
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ApiResponse<String> deleteVoucher(@PathVariable Long id) {
        voucherRepository.deleteById(id);
        return ApiResponse.success("Đã xóa voucher");
    }

    // User: apply voucher code
    @PostMapping("/apply")
    public ApiResponse<Map<String, Object>> applyVoucher(@RequestBody Map<String, Object> request) {
        String code = (String) request.get("code");
        Number amountNum = (Number) request.get("amount");
        long amount = amountNum != null ? amountNum.longValue() : 0;

        var voucherOpt = voucherRepository.findByCode(code);
        if (voucherOpt.isEmpty()) {
            return ApiResponse.error("Mã giảm giá không tồn tại");
        }

        Voucher voucher = voucherOpt.get();
        if (!voucher.isValid()) {
            return ApiResponse.error("Mã giảm giá đã hết hạn hoặc hết lượt sử dụng");
        }

        if (voucher.getMinOrderAmount() != null && amount < voucher.getMinOrderAmount()) {
            return ApiResponse.error("Đơn hàng chưa đạt giá trị tối thiểu " + voucher.getMinOrderAmount() + "đ");
        }

        long discount = voucher.calculateDiscount(amount);
        return ApiResponse.success(Map.of(
                "discount", discount,
                "finalAmount", amount - discount,
                "voucherCode", code,
                "description", voucher.getDescription() != null ? voucher.getDescription() : "Giảm " + discount + "đ"
        ));
    }
}
