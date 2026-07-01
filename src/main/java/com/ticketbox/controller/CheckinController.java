package com.ticketbox.controller;

import com.ticketbox.dto.request.CheckinRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.CheckinScanResponse;
import com.ticketbox.security.CustomUserDetails;
import com.ticketbox.service.CheckinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class CheckinController {

    private final CheckinService checkinService;

    @PostMapping("/scan")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<CheckinScanResponse>> scanQR(
            @Valid @RequestBody CheckinRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal CustomUserDetails userDetails) {

        CheckinScanResponse result = checkinService.processCheckin(request.getQrToken(), userDetails);
        return ResponseEntity.ok(ApiResponse.success("Check-in thành công", result));
    }

    @PostMapping("/checkout")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<CheckinScanResponse>> checkoutQR(
            @Valid @RequestBody CheckinRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal CustomUserDetails userDetails) {

        CheckinScanResponse result = checkinService.processCheckout(request.getQrToken(), userDetails);
        return ResponseEntity.ok(ApiResponse.success("Check-out thành công", result));
    }
}
