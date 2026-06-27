package com.ticketbox.repository;

import com.ticketbox.entity.Payout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayoutRepository extends JpaRepository<Payout, Long> {
    List<Payout> findByAgencyId(Long agencyId);
    List<Payout> findAllByOrderByCreatedAtDesc();
    List<Payout> findByStatusOrderByCreatedAtDesc(String status);
}
