package com.ticketbox.service;

import com.ticketbox.dto.response.OrganizerCustomerResponse;
import com.ticketbox.dto.response.OrganizerStatsResponse;
import com.ticketbox.dto.response.SalesDailyResponse;
import com.ticketbox.entity.Event;
import com.ticketbox.entity.Order;
import com.ticketbox.entity.UserTicket;
import com.ticketbox.enums.CheckinStatus;
import com.ticketbox.enums.EventStatus;
import com.ticketbox.repository.EventRepository;
import com.ticketbox.repository.OrderRepository;
import com.ticketbox.repository.UserTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizerDashboardService {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final UserTicketRepository userTicketRepository;

    public OrganizerStatsResponse getOrganizerStats(Long organizerId) {
        List<Event> events = eventRepository.findByOrganizerId(organizerId);

        long totalViews = events.stream().mapToLong(e -> e.getViews() != null ? e.getViews() : 0L).sum();
        long totalCapacity = events.stream()
                .flatMap(e -> e.getTicketTypes().stream())
                .mapToLong(tt -> tt.getTotalQuantity() != null ? tt.getTotalQuantity() : 0L)
                .sum();

        List<Order> paidOrders = orderRepository.findPaidOrdersByOrganizerId(organizerId);
        List<UserTicket> paidTickets = userTicketRepository.findPaidTicketsByOrganizerId(organizerId);

        long ticketsSold = paidTickets.size();
        long checkedInTickets = paidTickets.stream()
                .filter(t -> t.getCheckinStatus() == CheckinStatus.USED)
                .count();
        long unusedTickets = Math.max(0, ticketsSold - checkedInTickets);
        double attendanceRate = ticketsSold > 0 ? checkedInTickets * 100.0 / ticketsSold : 0.0;

        java.math.BigDecimal totalRevenue = paidTickets.stream()
                .map(t -> t.getTicketType() != null && t.getTicketType().getPrice() != null ? t.getTicketType().getPrice() : java.math.BigDecimal.ZERO)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        long pendingEvents = events.stream().filter(e -> e.getStatus() == EventStatus.PENDING).count();
        long publishedEvents = events.stream().filter(e -> e.getStatus() == EventStatus.PUBLISHED).count();
        long closedEvents = events.stream().filter(e -> e.getStatus() == EventStatus.CLOSED).count();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, List<Order>> ordersByDate = paidOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getCreatedAt().format(formatter), LinkedHashMap::new, Collectors.toList()));

        List<SalesDailyResponse> salesByDate = new ArrayList<>();
        ordersByDate.forEach((dateStr, orders) -> {
            long dayTicketsSold = orders.stream().mapToLong(o -> o.getUserTickets().size()).sum();
            java.math.BigDecimal dayRevenue = orders.stream()
                    .map(Order::getTotalAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            salesByDate.add(SalesDailyResponse.builder()
                    .date(dateStr)
                    .ticketsSold(dayTicketsSold)
                    .revenue(dayRevenue)
                    .ordersCount((long) orders.size())
                    .build());
        });
        salesByDate.sort(Comparator.comparing(SalesDailyResponse::getDate));

        return OrganizerStatsResponse.builder()
                .totalViews(totalViews)
                .ticketsSold(ticketsSold)
                .checkedInTickets(checkedInTickets)
                .unusedTickets(unusedTickets)
                .totalCapacity(totalCapacity)
                .totalEvents((long) events.size())
                .pendingEvents(pendingEvents)
                .publishedEvents(publishedEvents)
                .closedEvents(closedEvents)
                .attendanceRate(attendanceRate)
                .totalRevenue(totalRevenue)
                .salesByDate(salesByDate)
                .build();
    }

    public List<OrganizerCustomerResponse> getOrganizerCustomers(Long organizerId) {
        List<UserTicket> tickets = userTicketRepository.findPaidTicketsByOrganizerId(organizerId);
        return tickets.stream().map(t -> OrganizerCustomerResponse.builder()
                .customerName(t.getUser().getFullName())
                .customerEmail(t.getUser().getEmail())
                .customerPhone(t.getUser().getPhone())
                .ticketTypeName(t.getTicketType().getName())
                .ticketPrice(t.getTicketType().getPrice())
                .seatNumber(t.getSeat() != null ? t.getSeat().getName() : "Khong co")
                .checkinStatus(t.getCheckinStatus())
                .purchaseDate(t.getCreatedAt())
                .eventTitle(t.getTicketType().getEvent().getTitle())
                .eventId(t.getTicketType().getEvent().getId())
                .build()
        ).collect(Collectors.toList());
    }

    public String exportCustomersCsv(Long eventId, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay su kien"));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new RuntimeException("Ban khong co quyen xuat danh sach cua su kien nay");
        }

        List<UserTicket> tickets = userTicketRepository.findPaidTicketsByOrganizerId(organizerId).stream()
                .filter(t -> t.getTicketType().getEvent().getId().equals(eventId))
                .collect(Collectors.toList());

        StringBuilder csvContent = new StringBuilder();
        csvContent.append('\ufeff');
        csvContent.append("Ho ten,Email,So dien thoai,Loai ve,So ghe,Trang thai Check-in,Ngay mua\n");

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (UserTicket t : tickets) {
            String name = t.getUser().getFullName() != null ? t.getUser().getFullName().replace(",", " ") : "";
            String email = t.getUser().getEmail() != null ? t.getUser().getEmail() : "";
            String phone = t.getUser().getPhone() != null ? t.getUser().getPhone() : "";
            String type = t.getTicketType().getName() != null ? t.getTicketType().getName().replace(",", " ") : "";
            String seat = t.getSeat() != null ? t.getSeat().getName() : "Khong co";
            String checkin = t.getCheckinStatus() != null ? t.getCheckinStatus().name() : "UNUSED";
            String date = t.getCreatedAt() != null ? t.getCreatedAt().format(formatter) : "";

            csvContent.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    name, email, phone, type, seat, checkin, date));
        }

        return csvContent.toString();
    }
}
