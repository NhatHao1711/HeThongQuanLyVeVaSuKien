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
    List<UserTicket> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsBySeatIdAndOrderPaymentStatus(Long seatId, com.ticketbox.enums.PaymentStatus paymentStatus);

    @org.springframework.data.jpa.repository.Query("SELECT ut FROM UserTicket ut WHERE ut.ticketType.event.organizer.id = :organizerId AND ut.order.paymentStatus = com.ticketbox.enums.PaymentStatus.PAID ORDER BY ut.createdAt DESC")
    List<UserTicket> findPaidTicketsByOrganizerId(@org.springframework.data.repository.query.Param("organizerId") Long organizerId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(ut) > 0 FROM UserTicket ut WHERE ut.user.id = :userId AND ut.ticketType.event.id = :eventId AND ut.checkinStatus = :checkinStatus")
    boolean existsByUserIdAndEventIdAndCheckinStatus(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("eventId") Long eventId, @org.springframework.data.repository.query.Param("checkinStatus") com.ticketbox.enums.CheckinStatus checkinStatus);
}
