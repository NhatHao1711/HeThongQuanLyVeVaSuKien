package com.ticketbox.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "checkin_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CheckinLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private UserTicket ticket;

    @Column(name = "action", nullable = false, length = 20) // "CHECK_IN" or "CHECK_OUT"
    private String action;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scanner_id")
    private User scanner;

    @Column(name = "scanner_name", length = 255)
    private String scannerName;
}
