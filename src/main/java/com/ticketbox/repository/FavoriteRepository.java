package com.ticketbox.repository;

import com.ticketbox.entity.FavoriteEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<FavoriteEvent, Long> {

    List<FavoriteEvent> findByUserId(Long userId);

    Optional<FavoriteEvent> findByUserIdAndEventId(Long userId, Long eventId);

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    void deleteByUserIdAndEventId(Long userId, Long eventId);
}
