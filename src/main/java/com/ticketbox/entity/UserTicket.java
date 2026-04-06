package com.ticketbox.entity;

import com.ticketbox.enums.CheckinStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_tickets")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_type_id", nullable = false)
    private TicketType ticketType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "qr_token", unique = true, length = 500)
    private String qrToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "checkin_status", nullable = false, length = 10)
    @Builder.Default
    private CheckinStatus checkinStatus = CheckinStatus.UNUSED;

    @Column(name = "checkin_time")
    private LocalDateTime checkinTime;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id")
    private Seat seat;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
