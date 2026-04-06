package com.ticketbox.controller;

import com.ticketbox.dto.response.ApiResponse;
import com.ticketbox.dto.response.TicketResponse;
import com.ticketbox.entity.User;
import com.ticketbox.repository.UserRepository;
import com.ticketbox.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final UserRepository userRepository;

    /**
     * GET /api/tickets - Danh sách vé của user hiện tại
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getMyTickets(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<TicketResponse> tickets = ticketService.getUserTickets(user.getId());

        return ResponseEntity.ok(
                ApiResponse.success("Danh sách vé của bạn", tickets));
    }

    /**
     * GET /api/tickets/{id} - Chi tiết vé
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicketDetail(
            @PathVariable Long id) {

        TicketResponse ticket = ticketService.getTicketById(id);

        return ResponseEntity.ok(ApiResponse.success(ticket));
    }
}
