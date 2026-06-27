package com.ticketbox.repository;

import com.ticketbox.entity.FollowOrganizer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FollowOrganizerRepository extends JpaRepository<FollowOrganizer, Long> {
    boolean existsByUserIdAndOrganizerId(Long userId, Long organizerId);
    void deleteByUserIdAndOrganizerId(Long userId, Long organizerId);
    List<FollowOrganizer> findByUserId(Long userId);
    List<FollowOrganizer> findByOrganizerId(Long organizerId);
    long countByOrganizerId(Long organizerId);
}
