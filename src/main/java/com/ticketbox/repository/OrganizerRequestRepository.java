package com.ticketbox.repository;

import com.ticketbox.entity.OrganizerRequest;
import com.ticketbox.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrganizerRequestRepository extends JpaRepository<OrganizerRequest, Long> {
    List<OrganizerRequest> findByUserId(Long userId);
    List<OrganizerRequest> findByStatus(RequestStatus status);
}
