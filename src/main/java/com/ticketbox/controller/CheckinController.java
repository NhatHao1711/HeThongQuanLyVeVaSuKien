package com.ticketbox.controller;

import com.ticketbox.dto.request.CheckinRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.service.CheckinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<ApiResponse<String>> scanQR(
            @Valid @RequestBody CheckinRequest request) {

        String result = checkinService.processCheckin(request.getQrToken());

        return ResponseEntity.ok(ApiResponse.success(result, "CHECKED_IN"));
    }
}
