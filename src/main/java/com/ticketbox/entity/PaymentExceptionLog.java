package com.ticketbox.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_exception_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PaymentExceptionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_ref", length = 100)
    private String transactionRef;

    @Column(name = "expected_amount", precision = 12, scale = 2)
    private BigDecimal expectedAmount;

    @Column(name = "actual_amount", precision = 12, scale = 2)
    private BigDecimal actualAmount;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "UNRESOLVED"; // UNRESOLVED or RESOLVED

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
