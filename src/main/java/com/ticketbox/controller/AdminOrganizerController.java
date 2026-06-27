package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.entity.OrganizerRequest;
import com.ticketbox.service.OrganizerRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/organizers/requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrganizerController {

    private final OrganizerRequestService organizerRequestService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrganizerRequest>>> getPendingRequests() {
        List<OrganizerRequest> requests = organizerRequestService.getPendingRequests();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu thành công", requests));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<OrganizerRequest>> approveRequest(@PathVariable Long id) {
        OrganizerRequest request = organizerRequestService.approveRequest(id);
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt yêu cầu đại lý thành công", request));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<OrganizerRequest>> rejectRequest(@PathVariable Long id) {
        OrganizerRequest request = organizerRequestService.rejectRequest(id);
        return ResponseEntity.ok(ApiResponse.success("Từ chối yêu cầu đại lý thành công", request));
    }

    @GetMapping("/approved")
    public ResponseEntity<ApiResponse<List<OrganizerRequest>>> getApprovedRequests() {
        List<OrganizerRequest> requests = organizerRequestService.getApprovedRequests();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đại lý hoạt động thành công", requests));
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<ApiResponse<OrganizerRequest>> blockRequest(@PathVariable Long id) {
        OrganizerRequest request = organizerRequestService.blockAgency(id);
        return ResponseEntity.ok(ApiResponse.success("Khóa đại lý thành công", request));
    }

    @PostMapping("/{id}/unblock")
    public ResponseEntity<ApiResponse<OrganizerRequest>> unblockRequest(@PathVariable Long id) {
        OrganizerRequest request = organizerRequestService.unblockAgency(id);
        return ResponseEntity.ok(ApiResponse.success("Mở khóa đại lý thành công", request));
    }
}
