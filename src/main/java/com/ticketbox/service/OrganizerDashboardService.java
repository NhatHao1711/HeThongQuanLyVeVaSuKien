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
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizerDashboardService {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final UserTicketRepository userTicketRepository;

    public OrganizerStatsResponse getOrganizerStats(Long organizerId) {
        List<Event> events = eventRepository.findByOrganizerId(organizerId).stream()
                .filter(event -> event.getStatus() != EventStatus.CANCELLED)
                .collect(Collectors.toList());

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

        BigDecimal totalRevenue = BigDecimal.ZERO;
        for (Order o : paidOrders) {
            if (o.getTotalAmount() != null) {
                totalRevenue = totalRevenue.add(o.getTotalAmount());
            }
        }
        
        List<com.ticketbox.entity.SubPayment> partialPaidSubPayments = paidTickets.stream()
                .filter(t -> t.getSubPayment() != null && t.getSubPayment().getStatus() == com.ticketbox.enums.PaymentStatus.PAID)
                .map(UserTicket::getSubPayment)
                .distinct()
                .filter(sp -> sp.getOrder().getPaymentStatus() != com.ticketbox.enums.PaymentStatus.PAID)
                .collect(Collectors.toList());

        for (com.ticketbox.entity.SubPayment sp : partialPaidSubPayments) {
            if (sp.getAmount() != null) {
                totalRevenue = totalRevenue.add(sp.getAmount());
            }
        }

        long pendingEvents = events.stream().filter(e -> e.getStatus() == EventStatus.PENDING).count();
        long publishedEvents = events.stream().filter(e -> e.getStatus() == EventStatus.PUBLISHED).count();
        long closedEvents = events.stream().filter(e -> e.getStatus() == EventStatus.CLOSED).count();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        Map<String, List<Object>> salesItemsByDate = new LinkedHashMap<>();
        for (Order o : paidOrders) {
            String dateStr = o.getCreatedAt().format(formatter);
            salesItemsByDate.computeIfAbsent(dateStr, k -> new ArrayList<>()).add(o);
        }
        for (com.ticketbox.entity.SubPayment sp : partialPaidSubPayments) {
            String dateStr = sp.getCreatedAt().format(formatter);
            salesItemsByDate.computeIfAbsent(dateStr, k -> new ArrayList<>()).add(sp);
        }

        List<SalesDailyResponse> salesByDate = new ArrayList<>();
        salesItemsByDate.forEach((dateStr, items) -> {
            long dayTicketsSold = 0;
            BigDecimal dayRevenue = BigDecimal.ZERO;
            long ordersCount = 0;

            for (Object item : items) {
                if (item instanceof Order) {
                    Order o = (Order) item;
                    dayTicketsSold += o.getUserTickets().size();
                    if (o.getTotalAmount() != null) {
                        dayRevenue = dayRevenue.add(o.getTotalAmount());
                    }
                    ordersCount++;
                } else if (item instanceof com.ticketbox.entity.SubPayment) {
                    com.ticketbox.entity.SubPayment sp = (com.ticketbox.entity.SubPayment) item;
                    dayTicketsSold += paidTickets.stream().filter(t -> t.getSubPayment() != null && t.getSubPayment().getId().equals(sp.getId())).count();
                    if (sp.getAmount() != null) {
                        dayRevenue = dayRevenue.add(sp.getAmount());
                    }
                    ordersCount++;
                }
            }

            salesByDate.add(SalesDailyResponse.builder()
                    .date(dateStr)
                    .ticketsSold(dayTicketsSold)
                    .revenue(dayRevenue)
                    .ordersCount(ordersCount)
                    .build());
        });
        salesByDate.sort(Comparator.comparing(s -> s.getDate()));

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
        return tickets.stream()
                .filter(this::belongsToVisibleEvent)
                .map(t -> OrganizerCustomerResponse.builder()
                .customerName(t.getUser().getFullName())
                .customerEmail(t.getUser().getEmail())
                .customerPhone(t.getUser().getPhone())
                .ticketTypeName(t.getTicketType().getName())
                .ticketPrice(t.getTicketType().getPrice())
                .seatNumber(t.getSeat() != null ? t.getSeat().getName() : "Khong co")
                .checkinStatus(t.getCheckinStatus())
                .checkinTime(t.getCheckinTime())
                .checkoutTime(t.getCheckoutTime())
                .purchaseDate(t.getCreatedAt())
                .eventTitle(t.getTicketType().getEvent().getTitle())
                .eventId(t.getTicketType().getEvent().getId())
                .build()
        ).collect(Collectors.toList());
    }

    private boolean belongsToVisibleEvent(UserTicket ticket) {
        return ticket.getTicketType() != null
                && ticket.getTicketType().getEvent() != null
                && ticket.getTicketType().getEvent().getStatus() != EventStatus.CANCELLED;
    }

    public String exportCustomersCsv(Long eventId, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay su kien"));
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new RuntimeException("Su kien da bi xoa");
        }

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new RuntimeException("Ban khong co quyen xuat danh sach cua su kien nay");
        }

        List<UserTicket> tickets = userTicketRepository.findPaidTicketsByOrganizerId(organizerId).stream()
                .filter(t -> t.getTicketType().getEvent().getId().equals(eventId))
                .collect(Collectors.toList());

        StringBuilder csvContent = new StringBuilder();
        csvContent.append('\ufeff');
        csvContent.append("Ho ten,Email,So dien thoai,Loai ve,So ghe,Trang thai Check-in,Check-in luc,Check-out luc,Ngay mua\n");

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (UserTicket t : tickets) {
            String name = t.getUser().getFullName() != null ? t.getUser().getFullName().replace(",", " ") : "";
            String email = t.getUser().getEmail() != null ? t.getUser().getEmail() : "";
            String phone = t.getUser().getPhone() != null ? t.getUser().getPhone() : "";
            String type = t.getTicketType().getName() != null ? t.getTicketType().getName().replace(",", " ") : "";
            String seat = t.getSeat() != null ? t.getSeat().getName() : "Khong co";
            String checkin = t.getCheckinStatus() != null ? t.getCheckinStatus().name() : "UNUSED";
            String checkinTime = t.getCheckinTime() != null ? t.getCheckinTime().format(formatter) : "";
            String checkoutTime = t.getCheckoutTime() != null ? t.getCheckoutTime().format(formatter) : "";
            String date = t.getCreatedAt() != null ? t.getCreatedAt().format(formatter) : "";

            csvContent.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    name, email, phone, type, seat, checkin, checkinTime, checkoutTime, date));
        }

        return csvContent.toString();
    }
}
