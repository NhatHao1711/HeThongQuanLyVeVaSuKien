package com.ticketbox.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ticketbox.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "university_id")
    private University university;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "interests_tags", columnDefinition = "JSON")
    private String interestsTags;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.ROLE_USER;

    @JsonIgnore
    @Column(name = "reset_token", length = 255)
    private String resetToken;

    @Column(name = "balance", precision = 12, scale = 2)
    @Builder.Default
    private java.math.BigDecimal balance = java.math.BigDecimal.ZERO;

    @Column(name = "holding_balance", precision = 12, scale = 2)
    @Builder.Default
    private java.math.BigDecimal holdingBalance = java.math.BigDecimal.ZERO;

    @Column(name = "bank_account", columnDefinition = "JSON")
    private String bankAccount;

    @Column(name = "kyc_status", length = 20)
    private String kycStatus;

    @Column(name = "commission_rate", precision = 5, scale = 2)
    @Builder.Default
    private java.math.BigDecimal commissionRate = new java.math.BigDecimal("0.20");

    @Enumerated(EnumType.STRING)
    @Column(name = "agency_status", length = 20)
    private com.ticketbox.enums.AgencyStatus agencyStatus;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
