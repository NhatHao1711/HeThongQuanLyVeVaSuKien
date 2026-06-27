package com.ticketbox.service;

import com.ticketbox.entity.Seat;
import com.ticketbox.enums.SeatStatus;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class AdvancedSeatFinderServiceTest {

    @Test
    public void testHyperOptimizedSeatFinder() {
        System.out.println("\n=== BAT DAU TEST HYPER-OPTIMIZED SEAT FINDER ===\n");
        
        AdvancedSeatFinderService service = new AdvancedSeatFinderService();
        List<Seat> allSeats = new ArrayList<>();
        
        char[] rows = {'A', 'B', 'C', 'D'};
        for (char r : rows) {
            for (int c = 1; c <= 6; c++) {
                Seat s = new Seat();
                s.setId((long) (r * 100 + c));
                s.setName(r + String.format("%02d", c));
                s.setStatus(SeatStatus.AVAILABLE);
                allSeats.add(s);
            }
        }
        
        // TEST CASE 1: Tìm 3 ghế liền kề bằng Bitwise
        System.out.println("--- TEST CASE 1: Tìm 3 ghế liền kề trong rạp trống ---");
        List<Seat> res1 = service.findHyperOptimizedSeats(allSeats, 3, new ArrayList<>());
        System.out.println("Ket qua tim duoc: ");
        for (Seat s : res1) {
            System.out.print(s.getName() + " ");
        }
        System.out.println("\n");
        assertEquals(3, res1.size(), "Phải tìm được 3 ghế");
        
        // Khóa một số ghế để test BFS
        for (Seat s : allSeats) {
            if (s.getName().equals("A01") || s.getName().equals("B02") || 
                s.getName().equals("B03") || s.getName().equals("C04") ||
                s.getName().equals("D02") || s.getName().equals("D04") ||
                s.getName().equals("A04") || s.getName().equals("A05") || 
                s.getName().equals("A06") || s.getName().equals("B05") ||
                s.getName().equals("C01") || s.getName().equals("C02")) {
                s.setStatus(SeatStatus.BOOKED);
            }
        }
        
        System.out.println("--- SO DO GHE TRUC QUAN (X=BOOKED, O=TRONG) ---");
        int idx = 0;
        for (int i=0; i<4; i++) {
            for (int j=0; j<6; j++) {
                if (allSeats.get(idx).getStatus() == SeatStatus.BOOKED) {
                    System.out.print("[X] ");
                } else {
                    System.out.print("[O] ");
                }
                idx++;
            }
            System.out.println();
        }
        System.out.println();
        
        // TEST CASE 2: Tìm 4 ghế khi không có 4 ghế liền kề (Trigger BFS)
        System.out.println("--- TEST CASE 2: Tim 4 ghe (Khong co 4 ghe lien ke -> Kich hoat BFS) ---");
        List<Seat> res2 = service.findHyperOptimizedSeats(allSeats, 4, new ArrayList<>());
        System.out.println("Ket qua tim duoc: ");
        for (Seat s : res2) {
            System.out.print(s.getName() + " ");
        }
        System.out.println("\n");
        assertEquals(4, res2.size(), "Phải gom được 4 ghế bằng BFS");
    }
}
