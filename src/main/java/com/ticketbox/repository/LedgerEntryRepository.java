package com.ticketbox.repository;

import com.ticketbox.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByAgencyId(Long agencyId);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM LedgerEntry l JOIN l.order o JOIN o.userTickets ut JOIN ut.ticketType tt JOIN tt.event e WHERE e.id = :eventId AND l.status = :status")
    List<LedgerEntry> findByEventIdAndStatus(@org.springframework.data.repository.query.Param("eventId") Long eventId, @org.springframework.data.repository.query.Param("status") String status);
}
