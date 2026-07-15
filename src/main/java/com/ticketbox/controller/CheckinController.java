package com.ticketbox.controller;

import com.ticketbox.dto.request.CheckinRequest;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.CheckinScanResponse;
import com.ticketbox.dto.response.CheckinLogResponse;
import com.ticketbox.security.CustomUserDetails;
import com.ticketbox.service.CheckinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
public class CheckinController {

    private final CheckinService checkinService;

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<CheckinScanResponse>> scanQR(
            @Valid @RequestBody CheckinRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CheckinScanResponse result = checkinService.processCheckin(request.getQrToken(), userDetails);
        return ResponseEntity.ok(ApiResponse.success("Check-in thành công", result));
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<CheckinScanResponse>> checkoutQR(
            @Valid @RequestBody CheckinRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        CheckinScanResponse result = checkinService.processCheckout(request.getQrToken(), userDetails);
        return ResponseEntity.ok(ApiResponse.success("Check-out thành công", result));
    }

    @GetMapping("/admin/logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<CheckinLogResponse>>> getAdminLogs(
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<CheckinLogResponse> logs = checkinService.getAdminLogs(eventId, action, search, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy nhật ký ra vào thành công (Admin)", logs));
    }

    @GetMapping("/organizer/logs")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<Page<CheckinLogResponse>>> getOrganizerLogs(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<CheckinLogResponse> logs = checkinService.getOrganizerLogs(userDetails.getId(), eventId, action, search, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy nhật ký ra vào thành công (Đại lý)", logs));
    }

    @GetMapping("/admin/logs/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportAdminLogs(
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) String action) {
        
        String csv = checkinService.exportAdminLogsCsv(eventId, action);
        byte[] csvBytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("text/csv; charset=utf-8"));
        headers.setContentDispositionFormData("attachment", "checkin_logs_admin.csv");
        
        return new ResponseEntity<>(csvBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @GetMapping("/organizer/logs/export")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<byte[]> exportOrganizerLogs(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) String action) {
        
        String csv = checkinService.exportOrganizerLogsCsv(userDetails.getId(), eventId, action);
        byte[] csvBytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("text/csv; charset=utf-8"));
        headers.setContentDispositionFormData("attachment", "checkin_logs_organizer.csv");
        
        return new ResponseEntity<>(csvBytes, headers, org.springframework.http.HttpStatus.OK);
    }
}
