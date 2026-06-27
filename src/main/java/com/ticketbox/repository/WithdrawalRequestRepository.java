package com.ticketbox.repository;

import com.ticketbox.entity.WithdrawalRequest;
import com.ticketbox.enums.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, Long> {
    List<WithdrawalRequest> findByUserId(Long userId);
    List<WithdrawalRequest> findByStatus(RequestStatus status);
}
