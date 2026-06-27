package com.ticketbox.service;

import com.ticketbox.dto.request.CreateOrganizerRequestDTO;
import com.ticketbox.entity.OrganizerRequest;
import com.ticketbox.entity.User;
import com.ticketbox.enums.AgencyStatus;
import com.ticketbox.enums.RequestStatus;
import com.ticketbox.enums.UserRole;
import com.ticketbox.exception.ResourceNotFoundException;
import com.ticketbox.repository.OrganizerRequestRepository;
import com.ticketbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizerRequestService {

    private final OrganizerRequestRepository organizerRequestRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public OrganizerRequest createRequest(Long userId, CreateOrganizerRequestDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Kiểm tra xem người dùng đã gửi yêu cầu PENDING chưa
        List<OrganizerRequest> existingRequests = organizerRequestRepository.findByUserId(userId);
        boolean hasPending = existingRequests.stream()
                .anyMatch(r -> r.getStatus() == RequestStatus.PENDING);
        if (hasPending) {
            throw new IllegalStateException("Bạn đã gửi yêu cầu đăng ký đại lý và đang chờ phê duyệt.");
        }

        OrganizerRequest request = OrganizerRequest.builder()
                .user(user)
                .organizationName(dto.getOrganizationName())
                .contactEmail(dto.getContactEmail())
                .contactPhone(dto.getContactPhone())
                .documentUrl(dto.getDocumentUrl())
                .description(dto.getDescription())
                .status(RequestStatus.PENDING)
                .build();

        // Chỉ cập nhật agencyStatus sang PENDING, KHÔNG thay đổi role
        user.setAgencyStatus(AgencyStatus.PENDING);
        userRepository.save(user);

        // Email chúc mừng chỉ gửi khi Admin phê duyệt (trong approveRequest)
        return organizerRequestRepository.save(request);
    }

    public List<OrganizerRequest> getMyRequests(Long userId) {
        return organizerRequestRepository.findByUserId(userId);
    }

    public List<OrganizerRequest> getPendingRequests() {
        return organizerRequestRepository.findByStatus(RequestStatus.PENDING);
    }

    @Transactional
    public OrganizerRequest approveRequest(Long requestId) {
        OrganizerRequest request = organizerRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("OrganizerRequest", "id", requestId));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể duyệt yêu cầu đang ở trạng thái PENDING.");
        }

        request.setStatus(RequestStatus.APPROVED);
        
        User user = request.getUser();
        user.setRole(UserRole.ROLE_ORGANIZER);
        user.setAgencyStatus(AgencyStatus.APPROVED);
        userRepository.save(user);

        OrganizerRequest savedRequest = organizerRequestRepository.save(request);

        // Gửi email thông báo chúc mừng thành công trở thành Đại lý
        try {
            emailService.sendOrganizerWelcomeEmail(user.getEmail(), user.getFullName());
        } catch (Exception e) {
            log.error("⚠️ Lỗi gửi email chào mừng đại lý: {}", e.getMessage());
        }

        return savedRequest;
    }

    @Transactional
    public OrganizerRequest rejectRequest(Long requestId) {
        OrganizerRequest request = organizerRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("OrganizerRequest", "id", requestId));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("Chỉ có thể từ chối yêu cầu đang ở trạng thái PENDING.");
        }

        request.setStatus(RequestStatus.REJECTED);
        
        User user = request.getUser();
        user.setAgencyStatus(AgencyStatus.REJECTED);
        userRepository.save(user);

        return organizerRequestRepository.save(request);
    }

    public List<OrganizerRequest> getApprovedRequests() {
        return organizerRequestRepository.findAll().stream()
                .filter(r -> r.getStatus() == RequestStatus.APPROVED || r.getStatus() == RequestStatus.BLOCKED)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public OrganizerRequest blockAgency(Long requestId) {
        OrganizerRequest request = organizerRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("OrganizerRequest", "id", requestId));

        if (request.getStatus() != RequestStatus.APPROVED) {
            throw new IllegalStateException("Chỉ có thể khóa đại lý đang hoạt động (APPROVED).");
        }

        request.setStatus(RequestStatus.BLOCKED);
        
        User user = request.getUser();
        user.setRole(UserRole.ROLE_USER);
        user.setAgencyStatus(AgencyStatus.BLOCKED);
        userRepository.save(user);

        return organizerRequestRepository.save(request);
    }

    @Transactional
    public OrganizerRequest unblockAgency(Long requestId) {
        OrganizerRequest request = organizerRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("OrganizerRequest", "id", requestId));

        if (request.getStatus() != RequestStatus.BLOCKED) {
            throw new IllegalStateException("Chỉ có thể mở khóa đại lý đang bị khóa (BLOCKED).");
        }

        request.setStatus(RequestStatus.APPROVED);
        
        User user = request.getUser();
        user.setRole(UserRole.ROLE_ORGANIZER);
        user.setAgencyStatus(AgencyStatus.APPROVED);
        userRepository.save(user);

        return organizerRequestRepository.save(request);
    }
}
