package com.ticketbox.repository;

import com.ticketbox.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByTransactionRef(String transactionRef);
    List<Order> findByUserId(Long userId);
    List<Order> findByUserOrderByCreatedAtDesc(com.ticketbox.entity.User user);
    List<Order> findByPaymentStatusAndCreatedAtBefore(com.ticketbox.enums.PaymentStatus status, java.time.LocalDateTime time);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT o FROM Order o JOIN o.userTickets ut JOIN ut.ticketType tt JOIN tt.event e WHERE e.organizer.id = :organizerId AND o.paymentStatus = com.ticketbox.enums.PaymentStatus.PAID ORDER BY o.createdAt DESC")
    List<Order> findPaidOrdersByOrganizerId(@org.springframework.data.repository.query.Param("organizerId") Long organizerId);
}
