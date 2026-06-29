package com.ticketbox.repository;

import com.ticketbox.entity.PaymentExceptionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentExceptionLogRepository extends JpaRepository<PaymentExceptionLog, Long> {
    List<PaymentExceptionLog> findAllByOrderByCreatedAtDesc();
}
