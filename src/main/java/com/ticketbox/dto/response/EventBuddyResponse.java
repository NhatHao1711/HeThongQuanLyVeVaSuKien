package com.ticketbox.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventBuddyResponse {
    private Long buddyId;
    private Long eventId;
    private String eventTitle;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String receiverName;
    private String status;
}
