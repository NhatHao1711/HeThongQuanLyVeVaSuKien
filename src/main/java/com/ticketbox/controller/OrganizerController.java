package com.ticketbox.controller;

import com.ticketbox.dto.request.CreateOrganizerRequestDTO;
import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.OrganizerRequest;
import com.ticketbox.security.CustomUserDetails;
import com.ticketbox.service.OrganizerRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.ticketbox.dto.response.OrganizerCustomerResponse;
import com.ticketbox.dto.response.OrganizerStatsResponse;
import com.ticketbox.service.OrganizerDashboardService;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/organizers")
@RequiredArgsConstructor
public class OrganizerController {

    private final OrganizerRequestService organizerRequestService;
    private final OrganizerDashboardService organizerDashboardService;

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<OrganizerRequest>> createRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateOrganizerRequestDTO dto) {
        
        OrganizerRequest request = organizerRequestService.createRequest(userDetails.getId(), dto);
        return ResponseEntity.ok(ApiResponse.success("Gửi yêu cầu làm đại lý thành công", request));
    }

    @GetMapping("/requests/me")
    public ResponseEntity<ApiResponse<List<OrganizerRequest>>> getMyRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        List<OrganizerRequest> requests = organizerRequestService.getMyRequests(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu thành công", requests));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<OrganizerStatsResponse>> getStats(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        OrganizerStatsResponse stats = organizerDashboardService.getOrganizerStats(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy số liệu thống kê thành công", stats));
    }

    @GetMapping("/customers")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<ApiResponse<List<OrganizerCustomerResponse>>> getCustomers(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<OrganizerCustomerResponse> customers = organizerDashboardService.getOrganizerCustomers(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khách hàng thành công", customers));
    }

    @GetMapping("/events/{id}/export-csv")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<byte[]> exportCsv(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String csv = organizerDashboardService.exportCustomersCsv(id, userDetails.getId());
        byte[] csvBytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("text/csv; charset=utf-8"));
        headers.setContentDispositionFormData("attachment", "customers_event_" + id + ".csv");
        
        return new ResponseEntity<>(csvBytes, headers, org.springframework.http.HttpStatus.OK);
    }
}
