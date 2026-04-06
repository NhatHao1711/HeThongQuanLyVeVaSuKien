package com.ticketbox.repository;

import com.ticketbox.entity.UserTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserTicketRepository extends JpaRepository<UserTicket, Long> {
    Optional<UserTicket> findByQrToken(String qrToken);
    List<UserTicket> findByOrderId(Long orderId);
    List<UserTicket> findByUserId(Long userId);
}
