package com.ticketbox.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class SeatHoldService {

    private final ConcurrentMap<Long, HoldInfo> holds = new ConcurrentHashMap<>();

    public String getLockOwner(Long seatId) {
        HoldInfo hold = holds.get(seatId);
        if (hold == null) {
            return null;
        }
        if (hold.expiresAt().isBefore(LocalDateTime.now())) {
            holds.remove(seatId, hold);
            return null;
        }
        return hold.userId();
    }

    public void holdSeat(Long seatId, Long userId, Duration duration) {
        holds.put(seatId, new HoldInfo(userId.toString(), LocalDateTime.now().plus(duration)));
    }

    public void releaseSeat(Long seatId) {
        holds.remove(seatId);
    }

    public void releaseSeatIfOwner(Long seatId, Long userId) {
        HoldInfo hold = holds.get(seatId);
        if (hold != null && hold.userId().equals(userId.toString())) {
            holds.remove(seatId, hold);
        }
    }

    private record HoldInfo(String userId, LocalDateTime expiresAt) {
    }
}
