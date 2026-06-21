package com.ticketbox.repository;

import com.ticketbox.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findByTicketTypeId(Long ticketTypeId);
    Optional<Seat> findByTicketTypeIdAndName(Long ticketTypeId, String name);
    long countByTicketTypeId(Long ticketTypeId);
}
