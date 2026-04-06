package com.ticketbox.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Voucher {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String code;

    private String description;

    private Integer discountPercent; // e.g. 10 = 10%

    private Long discountAmount; // fixed amount in VND

    private Long minOrderAmount; // minimum order amount to apply

    private Integer maxUses;

    @Column(nullable = false)
    @Builder.Default
    private Integer currentUses = 0;

    private LocalDateTime expiryDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public boolean isValid() {
        if (!isActive) return false;
        if (maxUses != null && currentUses >= maxUses) return false;
        if (expiryDate != null && LocalDateTime.now().isAfter(expiryDate)) return false;
        return true;
    }

    public long calculateDiscount(long orderAmount) {
        if (discountPercent != null && discountPercent > 0) {
            return orderAmount * discountPercent / 100;
        }
        if (discountAmount != null && discountAmount > 0) {
            return Math.min(discountAmount, orderAmount);
        }
        return 0;
    }
}
