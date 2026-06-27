package com.ticketbox.service;

import com.ticketbox.dto.response.OrganizerCustomerResponse;
import com.ticketbox.dto.response.OrganizerStatsResponse;
import com.ticketbox.dto.response.SalesDailyResponse;
import com.ticketbox.entity.*;
import com.ticketbox.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizerDashboardService {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final UserTicketRepository userTicketRepository;
    private final UserRepository userRepository;

    public OrganizerStatsResponse getOrganizerStats(Long organizerId) {
        User organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Đại lý"));

        List<Event> events = eventRepository.findByOrganizerId(organizerId);

        // 1. Tổng lượt xem
        long totalViews = events.stream().mapToLong(e -> e.getViews() != null ? e.getViews() : 0L).sum();

        // 2. Tổng sức chứa
        long totalCapacity = events.stream()
                .flatMap(e -> e.getTicketTypes().stream())
                .mapToLong(tt -> tt.getTotalQuantity() != null ? tt.getTotalQuantity() : 0L)
                .sum();

        // 3. Số vé đã bán
        List<Order> paidOrders = orderRepository.findPaidOrdersByOrganizerId(organizerId);
        long ticketsSold = paidOrders.stream()
                .mapToLong(o -> o.getUserTickets().size())
                .sum();

        // 4. Doanh thu của Organizer (80%)
        BigDecimal commissionRate = organizer.getCommissionRate() != null ? organizer.getCommissionRate() : new BigDecimal("0.20");
        BigDecimal multiplier = BigDecimal.ONE.subtract(commissionRate);
        
        BigDecimal totalRevenue = paidOrders.stream()
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .multiply(multiplier);

        // 5. Doanh số theo ngày (salesByDate)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, List<Order>> ordersByDate = paidOrders.stream()
                .collect(Collectors.groupingBy(o -> o.getCreatedAt().format(formatter)));

        List<SalesDailyResponse> salesByDate = new ArrayList<>();
        ordersByDate.forEach((dateStr, orders) -> {
            long dayTicketsSold = orders.stream().mapToLong(o -> o.getUserTickets().size()).sum();
            BigDecimal dayRevenue = orders.stream()
                    .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .multiply(multiplier);

            salesByDate.add(SalesDailyResponse.builder()
                    .date(dateStr)
                    .ticketsSold(dayTicketsSold)
                    .revenue(dayRevenue)
                    .build());
        });

        salesByDate.sort(Comparator.comparing(SalesDailyResponse::getDate));

        return OrganizerStatsResponse.builder()
                .totalViews(totalViews)
                .ticketsSold(ticketsSold)
                .totalCapacity(totalCapacity)
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
                .seatNumber(t.getSeat() != null ? t.getSeat().getName() : "Không có")
                .checkinStatus(t.getCheckinStatus())
                .purchaseDate(t.getCreatedAt())
                .eventTitle(t.getTicketType().getEvent().getTitle())
                .eventId(t.getTicketType().getEvent().getId())
                .build()
        ).collect(Collectors.toList());
    }

    public String exportCustomersCsv(Long eventId, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện"));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new RuntimeException("Bạn không có quyền xuất danh sách của sự kiện này");
        }

        List<UserTicket> tickets = userTicketRepository.findPaidTicketsByOrganizerId(organizerId).stream()
                .filter(t -> t.getTicketType().getEvent().getId().equals(eventId))
                .collect(Collectors.toList());

        StringBuilder csvContent = new StringBuilder();
        csvContent.append('\ufeff'); // UTF-8 BOM
        csvContent.append("Họ tên,Email,Số điện thoại,Loại vé,Số ghế,Trạng thái Check-in,Ngày mua\n");

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (UserTicket t : tickets) {
            String name = t.getUser().getFullName() != null ? t.getUser().getFullName().replace(",", " ") : "";
            String email = t.getUser().getEmail() != null ? t.getUser().getEmail() : "";
            String phone = t.getUser().getPhone() != null ? t.getUser().getPhone() : "";
            String type = t.getTicketType().getName() != null ? t.getTicketType().getName().replace(",", " ") : "";
            String seat = t.getSeat() != null ? t.getSeat().getName() : "Không có";
            String checkin = t.getCheckinStatus() != null ? t.getCheckinStatus().name() : "UNUSED";
            String date = t.getCreatedAt() != null ? t.getCreatedAt().format(formatter) : "";

            csvContent.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    name, email, phone, type, seat, checkin, date));
        }

        return csvContent.toString();
    }
}
