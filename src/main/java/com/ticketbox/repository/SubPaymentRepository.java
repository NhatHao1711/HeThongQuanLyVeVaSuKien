package com.ticketbox.repository;

import com.ticketbox.entity.SubPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface SubPaymentRepository extends JpaRepository<SubPayment, Long> {
    Optional<SubPayment> findByPaymentLinkCode(String paymentLinkCode);
    Optional<SubPayment> findByTransactionRef(String transactionRef);
    List<SubPayment> findByOrderId(Long orderId);
}
