package com.ticketbox.controller;

import com.ticketbox.dto.request.CheckinRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.service.CheckinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.ticketbox.security.CustomUserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class CheckinController {

    private final CheckinService checkinService;

    /**
     * POST /api/checkin/scan - Ban tổ chức quét QR vé
     * Giải mã AES, kiểm tra vé, cập nhật USED, block trùng lặp.
     */
    @PostMapping("/scan")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<String>> scanQR(
            @Valid @RequestBody CheckinRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal CustomUserDetails userDetails) {

        String result = checkinService.processCheckin(request.getQrToken(), userDetails);

        return ResponseEntity.ok(ApiResponse.success(result, "CHECKED_IN"));
    }
}
