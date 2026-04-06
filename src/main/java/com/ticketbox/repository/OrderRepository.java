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
}
