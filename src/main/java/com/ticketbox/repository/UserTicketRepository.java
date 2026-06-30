package com.ticketbox.repository;

import com.ticketbox.entity.UserTicket;
import com.ticketbox.enums.CheckinStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserTicketRepository extends JpaRepository<UserTicket, Long> {
    Optional<UserTicket> findByQrToken(String qrToken);
    Optional<UserTicket> findByIdAndUserId(Long id, Long userId);
    List<UserTicket> findByOrderId(Long orderId);
    List<UserTicket> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsBySeatIdAndOrderPaymentStatus(Long seatId, com.ticketbox.enums.PaymentStatus paymentStatus);

    @org.springframework.data.jpa.repository.Query("SELECT ut FROM UserTicket ut WHERE ut.ticketType.event.organizer.id = :organizerId AND ut.order.paymentStatus = com.ticketbox.enums.PaymentStatus.PAID ORDER BY ut.createdAt DESC")
    List<UserTicket> findPaidTicketsByOrganizerId(@org.springframework.data.repository.query.Param("organizerId") Long organizerId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ut) > 0 FROM UserTicket ut WHERE ut.user.id = :userId AND ut.ticketType.event.id = :eventId AND ut.checkinStatus = :checkinStatus")
    boolean existsByUserIdAndEventIdAndCheckinStatus(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("eventId") Long eventId, @org.springframework.data.repository.query.Param("checkinStatus") com.ticketbox.enums.CheckinStatus checkinStatus);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE UserTicket ut SET ut.checkinStatus = :usedStatus, ut.checkinTime = :checkinTime WHERE ut.id = :ticketId AND ut.checkinStatus = :unusedStatus")
    int markUsedOnce(@org.springframework.data.repository.query.Param("ticketId") Long ticketId,
                     @org.springframework.data.repository.query.Param("usedStatus") CheckinStatus usedStatus,
                     @org.springframework.data.repository.query.Param("unusedStatus") CheckinStatus unusedStatus,
                     @org.springframework.data.repository.query.Param("checkinTime") LocalDateTime checkinTime);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE UserTicket ut SET ut.checkoutTime = :checkoutTime WHERE ut.id = :ticketId AND ut.checkinStatus = :usedStatus AND ut.checkoutTime IS NULL")
    int markCheckedOutOnce(@org.springframework.data.repository.query.Param("ticketId") Long ticketId,
                           @org.springframework.data.repository.query.Param("usedStatus") CheckinStatus usedStatus,
                           @org.springframework.data.repository.query.Param("checkoutTime") LocalDateTime checkoutTime);
}
